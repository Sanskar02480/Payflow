package com.payflow.kafka.event;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * The event Kafka emits on a successful transfer. Kept small and primitive --
 * downstream consumers should not need to load full entities.
 */
public record PaymentCompletedEvent(
        Long transactionId,
        Long senderWalletId,
        Long receiverWalletId,
        String senderEmail,
        String receiverEmail,
        BigDecimal amount,
        String idempotencyKey,
        Instant occurredAt
) {}
