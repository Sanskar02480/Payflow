package com.payflow.kafka;

import com.payflow.kafka.event.PaymentCompletedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

/**
 * Publishes payment_completed events. The senderWalletId is used as the
 * partition key so all events for a given wallet land in the same partition
 * and are processed in order.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${payflow.kafka.payment-completed-topic}")
    private String topic;

    public void publishPaymentCompleted(PaymentCompletedEvent event) {
        String partitionKey = String.valueOf(event.senderWalletId());
        kafkaTemplate.send(topic, partitionKey, event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to publish payment_completed for tx {}", event.transactionId(), ex);
                    } else {
                        log.info("Published payment_completed for tx {} to partition {}",
                                event.transactionId(),
                                result.getRecordMetadata().partition());
                    }
                });
    }
}
