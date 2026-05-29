package com.payflow.redis;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * Simple fixed-window rate limiter using Redis INCR + EXPIRE.
 *
 * Why this works:
 *   - INCR on a non-existent key creates it as 1 (atomic).
 *   - First time we see the key, we set a 60s TTL so the bucket resets.
 *   - If count > limit, we deny.
 *
 * Fixed-window has known edge cases at the window boundary, but for 10/min
 * it is good enough and trivially understandable. A sliding-window upgrade
 * (sorted set with timestamps) is a follow-up.
 */
@Service
@RequiredArgsConstructor
public class RateLimiterService {

    private static final String KEY_PREFIX = "ratelimit:";
    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final RedisTemplate<String, Object> redisTemplate;

    @Value("${payflow.rate-limit.payment-per-minute}")
    private int limit;

    /**
     * Returns true if the request is allowed, false if rate-limited.
     * Key the bucket by user + endpoint so each endpoint has its own quota.
     */
    public boolean tryAcquire(String bucketKey) {
        String redisKey = KEY_PREFIX + bucketKey;
        Long count = redisTemplate.opsForValue().increment(redisKey);
        if (count != null && count == 1L) {
            // First hit in this window -> attach TTL.
            redisTemplate.expire(redisKey, WINDOW);
        }
        return count != null && count <= limit;
    }
}
