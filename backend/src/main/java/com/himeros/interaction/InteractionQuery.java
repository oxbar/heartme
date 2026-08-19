package com.himeros.interaction;

import java.time.Instant;
import java.util.*;

public interface InteractionQuery {
    boolean hasSeen(UUID actor, UUID target);
    Set<UUID> seenBy(UUID actor);
    Optional<InteractionView> find(UUID actor, UUID target);
    List<InteractionView> recentBy(UUID actor, int limit);
    Map<UUID, InteractionView> latestBy(UUID actor, Collection<UUID> targets);

    record InteractionView(UUID targetId, String type, Instant createdAt) {}
}
