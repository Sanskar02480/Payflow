package com.payflow.transaction.dto;

import com.payflow.transaction.TransactionStatus;

import java.math.BigDecimal;
import java.time.Instant;

public record TransactionView(
        Long id,
        String senderEmail,
        String recipientEmail,
        BigDecimal amount,
        TransactionStatus status,
        String direction,    // "SENT" or "RECEIVED" relative to caller (null for admin view)
        Instant createdAt
) {}
