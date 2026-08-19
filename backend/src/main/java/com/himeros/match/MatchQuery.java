package com.himeros.match;

import java.time.Instant;
import java.util.*;

public interface MatchQuery {
    Set<UUID> activeCounterparts(UUID userId);
    Set<UUID> unmatchedSince(UUID userId, Instant since);
    List<MatchSignal> behaviorSignals(UUID userId, int limit);
    record MatchSignal(UUID targetId, String type, Instant occurredAt) {}
}
