package com.payflow.transaction;

import com.payflow.redis.IdempotencyService;
import com.payflow.transaction.dto.TransferRequest;
import com.payflow.transaction.dto.TransferResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Orchestrates a transfer. Idempotency layer wraps the ACID layer.
 *
 *   1) Idempotency check (Redis) BEFORE opening a DB tx -- fast reject.
 *   2) Delegate to AcidTransferExecutor (its own @Transactional + @Retryable).
 *   3) Cache the response in Redis under the idempotency key.
 *
 * Splitting "idempotency orchestration" from "ACID transfer" keeps both
 * concerns testable in isolation and dodges Spring's same-class proxy gotcha.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final IdempotencyService idempotencyService;
    private final AcidTransferExecutor acidTransferExecutor;

    public TransferResponse transfer(String senderEmail, String idempotencyKey, TransferRequest req) {

        // Replay path: cached response already exists.
        var cached = idempotencyService.getStoredResponse(idempotencyKey);
        if (cached.isPresent() && cached.get() instanceof TransferResponse tr) {
            log.info("Idempotency hit for key {} -> replaying", idempotencyKey);
            return asReplay(tr);
        }

        // First caller wins. SETNX atomically reserves the key for 24h.
        if (!idempotencyService.tryReserve(idempotencyKey)) {
            // Lost the SETNX race -- another request reserved first. Re-check cache.
            var maybe = idempotencyService.getStoredResponse(idempotencyKey);
            if (maybe.isPresent() && maybe.get() instanceof TransferResponse tr) {
                return asReplay(tr);
            }
            throw new IllegalStateException("Concurrent request with same Idempotency-Key in flight");
        }

        try {
            TransferResponse response = acidTransferExecutor.execute(senderEmail, idempotencyKey, req);
            idempotencyService.storeResponse(idempotencyKey, response);
            return response;
        } catch (RuntimeException e) {
            // Release the reservation so the client can retry with the same key.
            idempotencyService.release(idempotencyKey);
            throw e;
        }
    }

    private static TransferResponse asReplay(TransferResponse tr) {
        return new TransferResponse(
                tr.transactionId(), tr.senderEmail(), tr.recipientEmail(),
                tr.amount(), tr.status(), tr.senderNewBalance(), tr.completedAt(), true);
    }
}
