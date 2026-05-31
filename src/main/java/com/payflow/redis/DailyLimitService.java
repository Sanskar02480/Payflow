package com.payflow.redis;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneOffset;

/**
 * Enforces a per-user daily outgoing-transfer cap.
 *
 * Storage model: Redis counter keyed by "{email}:{UTC date}".
 * Values are stored in PAISE (integers) so INCRBY is exact -- no
 * floating-point money math, ever.
 *
 * Concurrency: tryConsume is atomic via INCRBY. If the post-increment
 * total exceeds the cap, we DECRBY the same amount and return false.
 * Two simultaneous transfers can both call INCRBY safely; at most one
 * will see "OK", the other rolls back.
 *
 * Refunds: do NOT replenish the daily budget. Real fintech behaves the
 * same way (Stripe, GPay) -- daily "spend" is measured at moment of
 * authorisation, not net of returns.
 *
 * Note: uses a dedicated StringRedisTemplate so INCRBY/GET work on raw
 * integers (the project's main RedisTemplate is JSON-serialised, which
 * would break atomic counter operations).
 */
@Service
@RequiredArgsConstructor
public class DailyLimitService {

    private static final String KEY_PREFIX = "daily_spent_paise:";
    private static final Duration TTL = Duration.ofHours(26); // safety past midnight

    private final StringRedisTemplate stringRedisTemplate;

    @Value("${payflow.daily-limit.amount}")
    private BigDecimal dailyLimitAmount;

    /**
     * Returns true if the amount fits inside today's remaining budget for
     * this user (and reserves it). Returns false otherwise (and reserves nothing).
     */
    public boolean tryConsume(String email, BigDecimal amount) {
        long amountPaise = toPaise(amount);
        long limitPaise = toPaise(dailyLimitAmount);

        String key = keyFor(email);
        Long newTotal = stringRedisTemplate.opsForValue().increment(key, amountPaise);
        if (newTotal == null) return false;

        // First write of the day -> attach TTL.
        if (newTotal == amountPaise) {
            stringRedisTemplate.expire(key, TTL);
        }

        if (newTotal > limitPaise) {
            // Exceeded -- roll back our reservation so a smaller transfer can still go through.
            stringRedisTemplate.opsForValue().increment(key, -amountPaise);
            return false;
        }
        return true;
    }

    /**
     * Roll back a previously-consumed amount. Called when the ACID transfer
     * fails AFTER tryConsume succeeded (so the budget isn't lost).
     */
    public void release(String email, BigDecimal amount) {
        long amountPaise = toPaise(amount);
        stringRedisTemplate.opsForValue().increment(keyFor(email), -amountPaise);
    }

    /** Total amount sent today by this user (₹), 0 if none. */
    public BigDecimal getSpentToday(String email) {
        String raw = stringRedisTemplate.opsForValue().get(keyFor(email));
        if (raw == null) return BigDecimal.ZERO;
        try {
            return new BigDecimal(raw).movePointLeft(2).setScale(2, RoundingMode.HALF_UP);
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }

    public BigDecimal getDailyLimit() {
        return dailyLimitAmount.setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal getRemainingToday(String email) {
        return getDailyLimit().subtract(getSpentToday(email)).max(BigDecimal.ZERO);
    }

    private static String keyFor(String email) {
        return KEY_PREFIX + email + ":" + LocalDate.now(ZoneOffset.UTC);
    }

    private static long toPaise(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP).movePointRight(2).longValueExact();
    }
}
