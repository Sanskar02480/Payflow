package com.payflow.transaction;

import com.payflow.redis.DailyLimitService;
import com.payflow.redis.IdempotencyService;
import com.payflow.transaction.dto.TransferRequest;
import com.payflow.transaction.dto.TransferResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Orchestrates a transfer. Idempotency + daily-limit layers wrap the ACID layer.
 *
 *   1) Idempotency check (Redis) BEFORE opening a DB tx -- fast reject on replay.
 *   2) Daily-limit consume (Redis) -- atomic INCRBY; rolled back on ACID failure.
 *   3) Delegate to AcidTransferExecutor (its own @Transactional + @Retryable).
 *   4) Cache the response in Redis under the idempotency key.
 *
 * Order matters: idempotency replays MUST short-circuit before we touch the
 * daily budget, otherwise a retried network call would double-consume it.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final IdempotencyService idempotencyService;
    private final DailyLimitService dailyLimitService;
    private final AcidTransferExecutor acidTransferExecutor;

    public TransferResponse transfer(String senderEmail, String idempotencyKey, TransferRequest req) {

        // 1) Replay path: cached response already exists.
        var cached = idempotencyService.getStoredResponse(idempotencyKey);
        if (cached.isPresent() && cached.get() instanceof TransferResponse tr) {
            log.info("Idempotency hit for key {} -> replaying", idempotencyKey);
            return asReplay(tr);
        }

        // 2) First caller wins. SETNX atomically reserves the key for 24h.
        if (!idempotencyService.tryReserve(idempotencyKey)) {
            // Lost the SETNX race -- another request reserved first. Re-check cache.
            var maybe = idempotencyService.getStoredResponse(idempotencyKey);
            if (maybe.isPresent() && maybe.get() instanceof TransferResponse tr) {
                return asReplay(tr);
            }
            throw new IllegalStateException("Concurrent request with same Idempotency-Key in flight");
        }

        // 3) Daily limit reservation. Released on ACID failure.
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
            // Release BOTH reservations so the client can retry cleanly with the same key.
            idempotencyService.release(idempotencyKey);
            dailyLimitService.release(senderEmail, req.amount());
            throw e;
        }
    }

    private static TransferResponse asReplay(TransferResponse tr) {
        return new TransferResponse(
                tr.transactionId(), tr.senderEmail(), tr.recipientEmail(),
                tr.amount(), tr.status(), tr.senderNewBalance(), tr.completedAt(), true);
    }
}
