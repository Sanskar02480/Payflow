package com.payflow.redis;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

/**
 * Idempotency check using Redis.
 *
 * Flow inside PaymentService:
 *   1) tryReserve(key)  -> returns true only on first call (SETNX)
 *   2) if true, process payment, then storeResponse(key, dto)
 *   3) if false, getStoredResponse(key) and return that (avoids double processing)
 *
 * Why Redis: it's atomic (SETNX guarantees only one client wins) and TTL gives
 * automatic cleanup. The DB still has a UNIQUE(idempotency_key) as backup.
 */
@Service
@RequiredArgsConstructor
public class IdempotencyService {

    private static final String KEY_PREFIX = "idem:";
    private static final String RESP_SUFFIX = ":resp";

    private final RedisTemplate<String, Object> redisTemplate;

    @Value("${payflow.idempotency.ttl-hours}")
    private long ttlHours;

    /** Atomically reserves the key. Returns true if this caller is the first. */
    public boolean tryReserve(String idempotencyKey) {
        Boolean ok = redisTemplate.opsForValue()
                .setIfAbsent(KEY_PREFIX + idempotencyKey, "RESERVED", Duration.ofHours(ttlHours));
        return Boolean.TRUE.equals(ok);
    }

    /** Stores the final response so future retries can return the same body. */
    public void storeResponse(String idempotencyKey, Object responseDto) {
        redisTemplate.opsForValue()
                .set(KEY_PREFIX + idempotencyKey + RESP_SUFFIX, responseDto, Duration.ofHours(ttlHours));
    }

    public Optional<Object> getStoredResponse(String idempotencyKey) {
        Object v = redisTemplate.opsForValue().get(KEY_PREFIX + idempotencyKey + RESP_SUFFIX);
        return Optional.ofNullable(v);
    }

    /** Release the reservation if the operation failed before storing a response. */
    public void release(String idempotencyKey) {
        redisTemplate.delete(KEY_PREFIX + idempotencyKey);
    }
}
