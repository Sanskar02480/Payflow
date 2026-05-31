package com.payflow.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

/**
 * Declares Kafka topics. Spring auto-creates them at startup if the broker
 * has auto.create.topics.enable=true (it does in our docker-compose).
 */
@Configuration
public class KafkaConfig {

    @Bean
    public NewTopic paymentCompletedTopic(
            @Value("${payflow.kafka.payment-completed-topic}") String topic) {
        return TopicBuilder.name(topic)
                .partitions(3)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic paymentRefundedTopic(
            @Value("${payflow.kafka.payment-refunded-topic}") String topic) {
        return TopicBuilder.name(topic)
                .partitions(3)
                .replicas(1)
                .build();
    }
}
