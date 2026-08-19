package com.himeros.messaging;

import java.time.Instant;
import java.util.*;

public interface MessagingQuery {
    List<EngagementSignal> engagementSignals(UUID userId, int limit);
    record EngagementSignal(UUID targetId, String type, Instant occurredAt) {}
}
