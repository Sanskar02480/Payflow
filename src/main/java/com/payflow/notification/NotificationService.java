package com.payflow.notification;

import com.payflow.kafka.event.PaymentCompletedEvent;
import com.payflow.kafka.event.PaymentRefundedEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Service;

/**
 * Kafka consumers for payment_completed and payment_refunded events.
 * In production these would call email/SMS providers. Here we log -- the
 * extension point is obvious: replace each log with an HTTP call to
 * Twilio / SendGrid / SES.
 */
@Service
@Slf4j
public class NotificationService {

    @KafkaListener(
            topics = "${payflow.kafka.payment-completed-topic}",
            groupId = "${spring.kafka.consumer.group-id}"
    )
    public void onPaymentCompleted(
            PaymentCompletedEvent event,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset
    ) {
        log.info("""
                [NOTIFICATION] partition={} offset={}
                  tx={} | {} -> {} | amount={} | at={}
                  >>> Email '{}': you received {} from '{}'
                  >>> Email '{}': you sent {} to '{}'""",
                partition, offset,
                event.transactionId(), event.senderEmail(), event.receiverEmail(),
                event.amount(), event.occurredAt(),
                event.receiverEmail(), event.amount(), event.senderEmail(),
                event.senderEmail(), event.amount(), event.receiverEmail());
    }

    @KafkaListener(
            topics = "${payflow.kafka.payment-refunded-topic}",
            groupId = "${spring.kafka.consumer.group-id}"
    )
    public void onPaymentRefunded(
            PaymentRefundedEvent event,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset
    ) {
        log.info("""
                [NOTIFICATION] partition={} offset={}
                  REFUND tx={} (original={}) | amount={} | at={}
                  >>> Email '{}': you got a refund of {} from '{}' (tx {})
                  >>> Email '{}': you refunded {} to '{}' (tx {})""",
                partition, offset,
                event.refundTransactionId(), event.originalTransactionId(),
                event.amount(), event.occurredAt(),
                event.originalSenderEmail(), event.amount(),
                event.originalRecipientEmail(), event.originalTransactionId(),
                event.originalRecipientEmail(), event.amount(),
                event.originalSenderEmail(), event.originalTransactionId());
    }
}
