package com.payflow.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

/**
 * Configures a RedisTemplate with String keys and JSON values.
 * Without this, Spring serializes with JdkSerialization (binary, ugly in redis-cli).
 */
@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory cf, ObjectMapper mapper) {
        RedisTemplate<String, Object> tmpl = new RedisTemplate<>();
        tmpl.setConnectionFactory(cf);
        tmpl.setKeySerializer(new StringRedisSerializer());
        tmpl.setHashKeySerializer(new StringRedisSerializer());
        tmpl.setValueSerializer(new GenericJackson2JsonRedisSerializer(mapper));
        tmpl.setHashValueSerializer(new GenericJackson2JsonRedisSerializer(mapper));
        tmpl.afterPropertiesSet();
        return tmpl;
    }
}
