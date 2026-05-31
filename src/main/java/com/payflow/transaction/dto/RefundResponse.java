package com.payflow.transaction.dto;

import com.payflow.transaction.TransactionStatus;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * Returned to the client after a refund. Also cached in Redis under the
 * refund's idempotency key so retries return the same body.
 */
public record RefundResponse(
        Long refundTransactionId,
        Long originalTransactionId,
        String originalSenderEmail,
        String originalRecipientEmail,
        BigDecimal amount,
        TransactionStatus status,            // always REFUND
        BigDecimal originalSenderNewBalance, // refund receiver's new balance
        Instant refundedAt,
        boolean replayed
) implements Serializable {}
