package com.payflow.kafka.event;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Emitted when a transfer is refunded. The notification service tells both
 * parties: original sender (got money back) and original recipient (lost money).
 */
public record PaymentRefundedEvent(
        Long refundTransactionId,
        Long originalTransactionId,
        Long refundSenderWalletId,        // = original recipient's wallet
        Long refundReceiverWalletId,       // = original sender's wallet
        String originalSenderEmail,        // who originally sent and is now getting refunded
        String originalRecipientEmail,     // who originally received and is now paying back
        BigDecimal amount,
        String idempotencyKey,
        Instant occurredAt
) {}
