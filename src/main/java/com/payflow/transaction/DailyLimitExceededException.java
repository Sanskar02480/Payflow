package com.payflow.transaction;

import java.math.BigDecimal;

/**
 * Thrown when a transfer would push the sender over their daily outgoing cap.
 * Mapped to HTTP 429 in GlobalExceptionHandler.
 */
public class DailyLimitExceededException extends RuntimeException {
    private final BigDecimal attempted;
    private final BigDecimal remaining;
    private final BigDecimal dailyLimit;

    public DailyLimitExceededException(BigDecimal attempted, BigDecimal remaining, BigDecimal dailyLimit) {
        super("Daily transfer limit exceeded. Attempted " + attempted
                + ", remaining today " + remaining + ", daily cap " + dailyLimit);
        this.attempted = attempted;
        this.remaining = remaining;
        this.dailyLimit = dailyLimit;
    }

    public BigDecimal getAttempted() { return attempted; }
    public BigDecimal getRemaining() { return remaining; }
    public BigDecimal getDailyLimit() { return dailyLimit; }
}
