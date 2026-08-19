package com.himeros.recommendation;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.DistributionSummary;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class DiscoveryMetrics {
    private final MeterRegistry registry;
    private final Timer requestTimer;
    private final DistributionSummary poolSize;
    private final DistributionSummary resultSize;
    private final Map<String, Counter> exclusions = new ConcurrentHashMap<>();

    public DiscoveryMetrics(MeterRegistry registry) {
        this.registry = registry;
        this.requestTimer = registry.timer("himeros.discovery.request");
        this.poolSize = registry.summary("himeros.discovery.pool.size");
        this.resultSize = registry.summary("himeros.discovery.result.size");
    }

    public Timer.Sample start() { return Timer.start(registry); }
    public void stop(Timer.Sample sample) { sample.stop(requestTimer); }
    public void pool(int size) { poolSize.record(size); }
    public void results(int size) { resultSize.record(size); }
    public void excluded(String reason) {
        exclusions.computeIfAbsent(reason, key -> Counter.builder("himeros.discovery.excluded")
            .tag("reason", key).register(registry)).increment();
    }
    public void cacheHit() { registry.counter("himeros.discovery.cache", "result", "hit").increment(); }
    public void cacheMiss() { registry.counter("himeros.discovery.cache", "result", "miss").increment(); }
    public void cacheError() { registry.counter("himeros.discovery.cache", "result", "error").increment(); }
}
