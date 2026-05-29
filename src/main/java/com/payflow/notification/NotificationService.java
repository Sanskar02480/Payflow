package com.payflow.notification;

import com.payflow.kafka.event.PaymentCompletedEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Service;

/**
 * Kafka consumer for payment_completed events.
 * In production this would call email/SMS providers. Here we log -- the
 * "extensibility point" is obvious: replace the log with an HTTP call to
 * Twilio / SendGrid / SES.
 *
 * Why the same Spring Boot app houses both producer and consumer:
 *   - simpler local dev (one mvn process)
 *   - easy to split later by pulling out the notification/ package into
 *     its own Maven module / repo without changing the topic contract.
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
        // TODO: replace with real email / SMS / push provider call.
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
}
