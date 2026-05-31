package com.payflow.transaction;

import com.payflow.redis.DailyLimitService;
import com.payflow.redis.IdempotencyService;
import com.payflow.transaction.dto.RefundResponse;
import com.payflow.transaction.dto.TransferRequest;
import com.payflow.transaction.dto.TransferResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Orchestrates transfers and refunds. Idempotency + daily-limit layers wrap the
 * ACID layer.
 *
 *   transfer:
 *     1) Idempotency replay check (Redis) BEFORE opening a DB tx
 *     2) Reserve idempotency key (SETNX)
 *     3) Try-consume daily-limit budget
 *     4) Delegate to AcidTransferExecutor.execute
 *     5) On failure, release BOTH reservations
 *
 *   refund:
 *     1) Idempotency replay check (separate key)
 *     2) Reserve idempotency key
 *     3) Delegate to AcidTransferExecutor.executeRefund
 *        (no daily-limit -- refunds are corrective, not new spend)
 *     4) On failure, release idempotency
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final IdempotencyService idempotencyService;
    private final DailyLimitService dailyLimitService;
    private final AcidTransferExecutor acidTransferExecutor;

    public TransferResponse transfer(String senderEmail, String idempotencyKey, TransferRequest req) {

        var cached = idempotencyService.getStoredResponse(idempotencyKey);
        if (cached.isPresent() && cached.get() instanceof TransferResponse tr) {
            log.info("Idempotency hit for key {} -> replaying transfer", idempotencyKey);
            return new TransferResponse(
                    tr.transactionId(), tr.senderEmail(), tr.recipientEmail(),
                    tr.amount(), tr.status(), tr.senderNewBalance(), tr.completedAt(), true);
        }

        if (!idempotencyService.tryReserve(idempotencyKey)) {
            var maybe = idempotencyService.getStoredResponse(idempotencyKey);
            if (maybe.isPresent() && maybe.get() instanceof TransferResponse tr) {
                return new TransferResponse(
                        tr.transactionId(), tr.senderEmail(), tr.recipientEmail(),
                        tr.amount(), tr.status(), tr.senderNewBalance(), tr.completedAt(), true);
            }
            throw new IllegalStateException("Concurrent request with same Idempotency-Key in flight");
        }

        if (!dailyLimitService.tryConsume(senderEmail, req.amount())) {
            idempotencyService.release(idempotencyKey);
            throw new DailyLimitExceededException(
                    req.amount(),
                    dailyLimitService.getRemainingToday(senderEmail),
                    dailyLimitService.getDailyLimit());
        }

        try {
            TransferResponse response = acidTransferExecutor.execute(senderEmail, idempotencyKey, req);
            idempotencyService.storeResponse(idempotencyKey, response);
            return response;
        } catch (RuntimeException e) {
            idempotencyService.release(idempotencyKey);
            dailyLimitService.release(senderEmail, req.amount());
            throw e;
        }
    }

    public RefundResponse refund(String callerEmail, Long originalTransactionId, String idempotencyKey) {

        var cached = idempotencyService.getStoredResponse(idempotencyKey);
        if (cached.isPresent() && cached.get() instanceof RefundResponse rr) {
            log.info("Idempotency hit for key {} -> replaying refund", idempotencyKey);
            return new RefundResponse(
                    rr.refundTransactionId(), rr.originalTransactionId(),
                    rr.originalSenderEmail(), rr.originalRecipientEmail(),
                    rr.amount(), rr.status(),
                    rr.originalSenderNewBalance(), rr.refundedAt(), true);
        }

        if (!idempotencyService.tryReserve(idempotencyKey)) {
            var maybe = idempotencyService.getStoredResponse(idempotencyKey);
            if (maybe.isPresent() && maybe.get() instanceof RefundResponse rr) {
                return new RefundResponse(
                        rr.refundTransactionId(), rr.originalTransactionId(),
                        rr.originalSenderEmail(), rr.originalRecipientEmail(),
                        rr.amount(), rr.status(),
                        rr.originalSenderNewBalance(), rr.refundedAt(), true);
            }
            throw new IllegalStateException("Concurrent refund with same Idempotency-Key in flight");
        }

        try {
            RefundResponse response = acidTransferExecutor.executeRefund(
                    callerEmail, originalTransactionId, idempotencyKey);
            idempotencyService.storeResponse(idempotencyKey, response);
            return response;
        } catch (RuntimeException e) {
            idempotencyService.release(idempotencyKey);
            throw e;
        }
    }
}
