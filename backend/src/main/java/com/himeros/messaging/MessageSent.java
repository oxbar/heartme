package com.himeros.messaging;

import java.time.Instant;
import java.util.UUID;

public record MessageSent(UUID messageId, UUID conversationId, UUID senderId, UUID recipientId, Instant sentAt) {}
