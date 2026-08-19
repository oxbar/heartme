package com.himeros.messaging;

import com.himeros.match.MatchCreated;
import com.himeros.match.MatchQuery;
import com.himeros.shared.*;
import com.himeros.shared.outbox.OutboxService;
import java.time.Instant;
import java.util.*;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MessagingService implements MessagingQuery {
    private final ConversationRepository conversations;
    private final MessageRepository messages;
    private final MatchQuery matches;
    private final MessageReactionRepository reactions;
    private final OutboxService outbox;
    private final SimpMessagingTemplate ws;
    private final ApplicationEventPublisher events;

    public MessagingService(ConversationRepository conversations, MessageRepository messages,
            MatchQuery matches, MessageReactionRepository reactions, OutboxService outbox, SimpMessagingTemplate ws,
            ApplicationEventPublisher events) {
        this.conversations = conversations;
        this.messages = messages;
        this.matches = matches;
        this.reactions = reactions;
        this.outbox = outbox;
        this.ws = ws;
        this.events = events;
    }

    @EventListener
    public void on(MatchCreated event) {
        conversations.findByMatchId(event.matchId())
            .orElseGet(() -> conversations.save(new Conversation(event.matchId(), event.userA(), event.userB())));
    }

    @Transactional(readOnly = true)
    public List<ConversationView> list(UUID user) {
        Set<UUID> activeCounterparts = matches.activeCounterparts(user);
        return conversations.findForUser(user).stream()
            .filter(conversation -> activeCounterparts.contains(other(conversation, user)))
            .map(MessagingService::view)
            .toList();
    }

    @Transactional
    public MessageView send(UUID user, UUID conversationId, String body) {
        Conversation conversation = owned(user, conversationId);
        String content = body == null ? "" : body.trim();
        if (content.isBlank() || content.length() > 4000)
            throw new IllegalArgumentException("Message must contain 1-4000 characters");

        Message message = messages.save(new Message(conversationId, user, content));
        conversation.touch(message.sent());
        MessageView result = messageView(message, 0, false);
        outbox.append("Message", message.id(), "himeros.messaging.message-sent.v1", "himeros.messaging.events.v1",
            conversationId, Map.of("messageId", message.id(), "conversationId", conversationId, "senderId", user));
        ws.convertAndSend(messageTopic(conversationId), result);
        UUID recipient = conversation.a().equals(user) ? conversation.b() : conversation.a();
        events.publishEvent(new MessageSent(message.id(), conversationId, user, recipient, message.sent()));
        return result;
    }

    @Transactional(readOnly = true)
    public List<MessageView> history(UUID user, UUID conversationId, Instant before, int limit) {
        owned(user, conversationId);
        var page = PageRequest.of(0, Math.min(Math.max(limit, 1), 100));
        List<Message> pageItems = before == null ? messages.latest(conversationId, page) : messages.before(conversationId, before, page);
        Map<UUID, MessageReactionRepository.ReactionSummary> summary = reactions.summaries(
            pageItems.stream().map(Message::id).toList(), user);
        return pageItems.stream().map(message -> {
            var reaction = summary.get(message.id());
            return messageView(message, reaction == null ? 0 : reaction.heartCount(), reaction != null && reaction.reactedByMe());
        }).toList();
    }

    @Transactional
    public int markRead(UUID user, UUID conversationId) {
        owned(user, conversationId);
        int updated = messages.markRead(conversationId, user);
        if (updated > 0) {
            ReadReceipt receipt = new ReadReceipt(conversationId, user, Instant.now());
            ws.convertAndSend(receiptTopic(conversationId), receipt);
        }
        return updated;
    }

    @Transactional
    public ReactionView toggleHeart(UUID user, UUID conversationId, UUID messageId) {
        owned(user, conversationId);
        Message message = messages.findByIdAndConversationId(messageId, conversationId)
            .orElseThrow(() -> new ResourceNotFoundException("Message not found"));

        boolean active;
        if (reactions.hasHeart(message.id(), user)) {
            reactions.removeHeart(message.id(), user);
            active = false;
        } else {
            reactions.addHeart(message.id(), user, Instant.now());
            active = true;
        }
        int count = reactions.heartCount(message.id());
        ReactionEvent event = new ReactionEvent(conversationId, message.id(), user, active, count, Instant.now());
        ws.convertAndSend(reactionTopic(conversationId), event);
        return new ReactionView(message.id(), count, active);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MessagingQuery.EngagementSignal> engagementSignals(UUID user, int limit) {
        List<Conversation> recent = conversations.findRecentForUser(user,
            PageRequest.of(0, Math.max(1, Math.min(limit, 200))));
        if (recent.isEmpty()) return List.of();
        Map<UUID, Object[]> engagement = new HashMap<>();
        for (Object[] row : messages.engagementByConversationIds(recent.stream().map(Conversation::id).toList(), user))
            engagement.put((UUID) row[0], row);
        return recent.stream().map(conversation -> {
            Object[] row = engagement.get(conversation.id());
            if (row == null) return null;
            long count = ((Number) row[1]).longValue();
            UUID target = conversation.a().equals(user) ? conversation.b() : conversation.a();
            String type = count >= 3 ? "CONVERSATION" : "MESSAGE";
            Instant at = (Instant) row[2];
            return new MessagingQuery.EngagementSignal(target, type, at);
        }).filter(Objects::nonNull).toList();
    }

    private Conversation owned(UUID user, UUID id) {
        Conversation conversation = conversations.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));
        if (!conversation.contains(user)) throw new ForbiddenException("Not your conversation");
        if (!matches.activeCounterparts(user).contains(other(conversation, user)))
            throw new ForbiddenException("Match is no longer active");
        return conversation;
    }

    private static UUID other(Conversation conversation, UUID user) {
        return conversation.a().equals(user) ? conversation.b() : conversation.a();
    }

    private static String messageTopic(UUID conversationId) {
        return "/topic/conversations/" + conversationId;
    }

    private static String receiptTopic(UUID conversationId) {
        return messageTopic(conversationId) + "/receipts";
    }

    private static String reactionTopic(UUID conversationId) {
        return messageTopic(conversationId) + "/reactions";
    }

    private static ConversationView view(Conversation conversation) {
        return new ConversationView(conversation.id(), conversation.matchId(), conversation.a(), conversation.b(),
            conversation.created(), conversation.last());
    }

    private static MessageView messageView(Message message, int heartReactionCount, boolean heartReactedByMe) {
        return new MessageView(message.id(), message.conversation(), message.sender(), message.content(), message.sent(),
            message.read(), heartReactionCount, heartReactedByMe);
    }

    public record ConversationView(UUID id, UUID matchId, UUID userA, UUID userB, Instant createdAt, Instant lastMessageAt) {}
    public record MessageView(UUID id, UUID conversationId, UUID senderId, String content, Instant sentAt, Instant readAt,
            int heartReactionCount, boolean heartReactedByMe) {}
    public record ReadReceipt(UUID conversationId, UUID readerId, Instant readAt) {}
    public record ReactionView(UUID messageId, int heartReactionCount, boolean heartReactedByMe) {}
    public record ReactionEvent(UUID conversationId, UUID messageId, UUID actorId, boolean active, int heartReactionCount,
            Instant at) {}
}
