package com.himeros.interaction;

import java.util.UUID;

/**
 * Published for every committed positive discovery decision. Match reconciliation
 * happens after commit so two browser sessions cannot miss each other's LIKE.
 */
public record PositiveInteractionRecorded(UUID actorId, UUID targetId, String type) {
}
