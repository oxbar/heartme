package com.himeros.messaging;

import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConversationAccess {
    private final ConversationRepository conversations;

    public ConversationAccess(ConversationRepository conversations) {
        this.conversations = conversations;
    }

    @Transactional(readOnly = true)
    public boolean canAccess(UUID userId, UUID conversationId) {
        return conversations.findById(conversationId)
            .map(conversation -> conversation.contains(userId))
            .orElse(false);
    }
}
