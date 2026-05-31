package com.payflow.transaction.dto;

import java.math.BigDecimal;

public record DailySpentResponse(
        BigDecimal spentToday,
        BigDecimal dailyLimit,
        BigDecimal remaining
) {}
