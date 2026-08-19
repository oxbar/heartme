package com.himeros.trustsafety;

import java.time.Instant;
import java.util.*;

public interface TrustSafetyQuery {
    boolean blockedEitherWay(UUID a, UUID b);
    Set<UUID> excluded(UUID user);
    List<SafetySignal> behaviorSignals(UUID user, int limit);
    record SafetySignal(UUID targetId, String type, Instant occurredAt) {}
}
