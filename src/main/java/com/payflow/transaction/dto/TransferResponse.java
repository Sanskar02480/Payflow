package com.payflow.transaction.dto;

import com.payflow.transaction.TransactionStatus;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * Returned to the client after a transfer. Also cached in Redis under the
 * idempotency key so retries return the same body byte-for-byte.
 * Implements Serializable so the Jackson Redis serializer can roundtrip it.
 */
public record TransferResponse(
        Long transactionId,
        String senderEmail,
        String recipientEmail,
        BigDecimal amount,
        TransactionStatus status,
        BigDecimal senderNewBalance,
        Instant completedAt,
        boolean replayed
) implements Serializable {}
