package com.payflow.kafka;

import com.payflow.kafka.event.PaymentCompletedEvent;
import com.payflow.kafka.event.PaymentRefundedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

/**
 * Publishes payment_completed and payment_refunded events. The senderWalletId
 * is used as the partition key so all events for a given wallet land in the
 * same partition and are processed in order.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${payflow.kafka.payment-completed-topic}")
    private String completedTopic;

    @Value("${payflow.kafka.payment-refunded-topic}")
    private String refundedTopic;

    public void publishPaymentCompleted(PaymentCompletedEvent event) {
        String partitionKey = String.valueOf(event.senderWalletId());
        kafkaTemplate.send(completedTopic, partitionKey, event)
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

    public void publishPaymentRefunded(PaymentRefundedEvent event) {
        // Partition on the original sender wallet so refund events stay ordered
        // alongside their original payment_completed event on the same wallet.
        String partitionKey = String.valueOf(event.refundReceiverWalletId());
        kafkaTemplate.send(refundedTopic, partitionKey, event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to publish payment_refunded for refund tx {}",
                                event.refundTransactionId(), ex);
                    } else {
                        log.info("Published payment_refunded for refund tx {} (original {}) to partition {}",
                                event.refundTransactionId(),
                                event.originalTransactionId(),
                                result.getRecordMetadata().partition());
                    }
                });
    }
}
