package com.payflow.transaction;

import com.payflow.redis.DailyLimitService;
import com.payflow.redis.IdempotencyService;
import com.payflow.transaction.dto.RefundResponse;
import com.payflow.transaction.dto.TransferRequest;
import com.payflow.transaction.dto.TransferResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Unit tests for PaymentService -- pure Mockito, no Spring context, no real
 * Redis / Postgres / Kafka.
 *
 * PaymentService is the orchestration layer; it composes IdempotencyService,
 * DailyLimitService, and AcidTransferExecutor. These tests verify that
 * composition (the "right thing happens in the right order, and reservations
 * are released cleanly on failure") -- not the underlying DB / Redis semantics.
 *
 * The ACID and locking behaviour live inside AcidTransferExecutor and are best
 * covered by Testcontainers-backed integration tests as a follow-up.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("PaymentService")
class PaymentServiceTest {

    @Mock private IdempotencyService idempotencyService;
    @Mock private DailyLimitService dailyLimitService;
    @Mock private AcidTransferExecutor acidTransferExecutor;

    @InjectMocks private PaymentService paymentService;

    private static final String SENDER     = "alice@payflow.dev";
    private static final String RECIPIENT  = "bob@payflow.dev";
    private static final String IDEM_KEY   = "7f3a0e8c-1111-4222-8333-444555666777";
    private static final Long ORIGINAL_TX  = 42L;
    private static final BigDecimal AMOUNT       = new BigDecimal("100.00");
    private static final BigDecimal DAILY_LIMIT  = new BigDecimal("50000.00");
    private static final BigDecimal REMAINING    = new BigDecimal("49900.00");

    private TransferRequest request;
    private TransferResponse executorResponse;
    private RefundResponse refundResponse;

    @BeforeEach
    void setUp() {
        request = new TransferRequest(RECIPIENT, AMOUNT);

        executorResponse = new TransferResponse(
                /* transactionId   */ ORIGINAL_TX,
                /* senderEmail     */ SENDER,
                /* recipientEmail  */ RECIPIENT,
                /* amount          */ AMOUNT,
                /* status          */ TransactionStatus.COMPLETED,
                /* senderBalance   */ new BigDecimal("900.00"),
                /* completedAt     */ Instant.parse("2026-05-31T10:00:00Z"),
                /* replayed        */ false);

        refundResponse = new RefundResponse(
                /* refundTxId         */ 99L,
                /* originalTxId       */ ORIGINAL_TX,
                /* origSenderEmail    */ SENDER,
                /* origRecipientEmail */ RECIPIENT,
                /* amount             */ AMOUNT,
                /* status             */ TransactionStatus.REFUND,
                /* origSenderBalance  */ new BigDecimal("950.00"),
                /* refundedAt         */ Instant.parse("2026-05-31T11:00:00Z"),
                /* replayed           */ false);
    }

    // ───────────────────────────── transfer ─────────────────────────────

    @Nested
    @DisplayName("transfer")
    class Transfer {

        @Test
        @DisplayName("happy path: reserves idempotency, consumes limit, executes, caches response")
        void happyPath() {
            when(idempotencyService.getStoredResponse(IDEM_KEY)).thenReturn(Optional.empty());
            when(idempotencyService.tryReserve(IDEM_KEY)).thenReturn(true);
            when(dailyLimitService.tryConsume(SENDER, AMOUNT)).thenReturn(true);
            when(acidTransferExecutor.execute(SENDER, IDEM_KEY, request)).thenReturn(executorResponse);

            TransferResponse result = paymentService.transfer(SENDER, IDEM_KEY, request);

            assertThat(result).isEqualTo(executorResponse);
            assertThat(result.replayed()).isFalse();

            // Response cached for future retries with the same key
            verify(idempotencyService).storeResponse(IDEM_KEY, executorResponse);
            // Reservations are NOT released on success -- they belong to the cached response now
            verify(idempotencyService, never()).release(anyString());
            verify(dailyLimitService, never()).release(anyString(), any());
        }

        @Test
        @DisplayName("duplicate idempotency key: replays cached response without touching DB or limit")
        void replaysCachedResponseOnDuplicateKey() {
            when(idempotencyService.getStoredResponse(IDEM_KEY))
                    .thenReturn(Optional.of(executorResponse));

            TransferResponse result = paymentService.transfer(SENDER, IDEM_KEY, request);

            // Same data, but the replayed flag flips to true so the client knows
            assertThat(result.transactionId()).isEqualTo(executorResponse.transactionId());
            assertThat(result.amount()).isEqualByComparingTo(executorResponse.amount());
            assertThat(result.recipientEmail()).isEqualTo(executorResponse.recipientEmail());
            assertThat(result.replayed()).isTrue();

            // CRITICAL: no money moved, no budget consumed, no new reservation
            verifyNoInteractions(acidTransferExecutor);
            verify(idempotencyService, never()).tryReserve(anyString());
            verify(dailyLimitService, never()).tryConsume(anyString(), any());
        }

        @Test
        @DisplayName("daily limit exceeded: throws and releases the idempotency reservation")
        void dailyLimitExceeded() {
            when(idempotencyService.getStoredResponse(IDEM_KEY)).thenReturn(Optional.empty());
            when(idempotencyService.tryReserve(IDEM_KEY)).thenReturn(true);
            when(dailyLimitService.tryConsume(SENDER, AMOUNT)).thenReturn(false);
            when(dailyLimitService.getRemainingToday(SENDER)).thenReturn(REMAINING);
            when(dailyLimitService.getDailyLimit()).thenReturn(DAILY_LIMIT);

            assertThatThrownBy(() -> paymentService.transfer(SENDER, IDEM_KEY, request))
                    .isInstanceOf(DailyLimitExceededException.class)
                    .hasMessageContaining("Daily transfer limit exceeded");

            // The idempotency key MUST be released so a retry tomorrow can succeed
            verify(idempotencyService).release(IDEM_KEY);
            // ACID layer was never touched
            verifyNoInteractions(acidTransferExecutor);
            // No response cached for a rejected transfer
            verify(idempotencyService, never()).storeResponse(eq(IDEM_KEY), any());
        }

        @Test
        @DisplayName("ACID executor failure: releases BOTH the idempotency key and the daily-limit budget")
        void acidFailureReleasesAllReservations() {
            when(idempotencyService.getStoredResponse(IDEM_KEY)).thenReturn(Optional.empty());
            when(idempotencyService.tryReserve(IDEM_KEY)).thenReturn(true);
            when(dailyLimitService.tryConsume(SENDER, AMOUNT)).thenReturn(true);
            when(acidTransferExecutor.execute(SENDER, IDEM_KEY, request))
                    .thenThrow(new IllegalArgumentException("Insufficient balance"));

            assertThatThrownBy(() -> paymentService.transfer(SENDER, IDEM_KEY, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Insufficient balance");

            // Both reservations cleaned up so the same key can be retried after fixing the cause
            verify(idempotencyService).release(IDEM_KEY);
            verify(dailyLimitService).release(SENDER, AMOUNT);
            // Failed transfer -- no response cached
            verify(idempotencyService, never()).storeResponse(eq(IDEM_KEY), any());
        }
    }

    // ───────────────────────────── refund ─────────────────────────────

    @Nested
    @DisplayName("refund")
    class Refund {

        @Test
        @DisplayName("happy path: reserves and executes refund without touching the daily-limit budget")
        void happyPath() {
            when(idempotencyService.getStoredResponse(IDEM_KEY)).thenReturn(Optional.empty());
            when(idempotencyService.tryReserve(IDEM_KEY)).thenReturn(true);
            when(acidTransferExecutor.executeRefund(RECIPIENT, ORIGINAL_TX, IDEM_KEY))
                    .thenReturn(refundResponse);

            RefundResponse result = paymentService.refund(RECIPIENT, ORIGINAL_TX, IDEM_KEY);

            assertThat(result).isEqualTo(refundResponse);
            assertThat(result.status()).isEqualTo(TransactionStatus.REFUND);

            // Refunds are corrective, NOT new spend -- the daily budget must stay untouched
            verifyNoInteractions(dailyLimitService);
            // Refund response cached so retries with the same key return the same body
            verify(idempotencyService).storeResponse(IDEM_KEY, refundResponse);
        }

        @Test
        @DisplayName("duplicate idempotency key: replays cached refund response")
        void replaysCachedRefundOnDuplicateKey() {
            when(idempotencyService.getStoredResponse(IDEM_KEY))
                    .thenReturn(Optional.of(refundResponse));

            RefundResponse result = paymentService.refund(RECIPIENT, ORIGINAL_TX, IDEM_KEY);

            assertThat(result.refundTransactionId()).isEqualTo(refundResponse.refundTransactionId());
            assertThat(result.originalTransactionId()).isEqualTo(refundResponse.originalTransactionId());
            assertThat(result.replayed()).isTrue();

            // No second refund happened
            verifyNoInteractions(acidTransferExecutor);
            verifyNoInteractions(dailyLimitService);
        }

        @Test
        @DisplayName("ACID executor failure: releases the idempotency reservation")
        void acidFailureReleasesIdempotency() {
            when(idempotencyService.getStoredResponse(IDEM_KEY)).thenReturn(Optional.empty());
            when(idempotencyService.tryReserve(IDEM_KEY)).thenReturn(true);
            when(acidTransferExecutor.executeRefund(RECIPIENT, ORIGINAL_TX, IDEM_KEY))
                    .thenThrow(new IllegalStateException(
                            "Only COMPLETED transactions can be refunded (current status: REVERSED)"));

            assertThatThrownBy(() -> paymentService.refund(RECIPIENT, ORIGINAL_TX, IDEM_KEY))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Only COMPLETED");

            verify(idempotencyService).release(IDEM_KEY);
            verify(idempotencyService, never()).storeResponse(eq(IDEM_KEY), any());
        }
    }
}
