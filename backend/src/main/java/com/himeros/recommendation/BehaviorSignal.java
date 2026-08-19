package com.himeros.recommendation;

import java.time.Instant;
import java.util.UUID;

public record BehaviorSignal(UUID targetId, BehaviorSignalType type, Instant occurredAt) {}

enum BehaviorSignalType {
    VIEW,
    PASS,
    LIKE,
    SUPER_LIKE,
    MATCH,
    MESSAGE,
    CONVERSATION,
    UNMATCH,
    BLOCK,
    REPORT
}
