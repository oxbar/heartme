package com.himeros.recommendation;

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class CandidatePoolCache {
    private static final String PREFIX = "discovery:pool:v2:";
    private final StringRedisTemplate redis;
    private final DiscoveryMetrics metrics;

    public CandidatePoolCache(StringRedisTemplate redis, DiscoveryMetrics metrics) {
        this.redis = redis;
        this.metrics = metrics;
    }

    public Optional<List<UUID>> get(String key) {
        try {
            String raw = redis.opsForValue().get(PREFIX + key);
            if (raw == null || raw.isBlank()) {
                metrics.cacheMiss();
                return Optional.empty();
            }
            metrics.cacheHit();
            return Optional.of(Arrays.stream(raw.split(",")).filter(s -> !s.isBlank()).map(UUID::fromString).toList());
        } catch (RuntimeException ex) {
            metrics.cacheError();
            return Optional.empty();
        }
    }

    public void put(String key, List<UUID> ids, Duration ttl) {
        try {
            String raw = ids.stream().map(UUID::toString).collect(Collectors.joining(","));
            redis.opsForValue().set(PREFIX + key, raw, ttl);
        } catch (RuntimeException ex) {
            metrics.cacheError();
        }
    }

}