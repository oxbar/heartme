package com.himeros.messaging;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.himeros.match.MatchQuery;
import com.himeros.shared.outbox.OutboxService;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.messaging.simp.SimpMessagingTemplate;

class MessagingServiceSocialTest {

    @Test
    void readReceiptIsBroadcastWhenMessagesBecomeRead() {
        Fixture f = new Fixture();
        Conversation conversation = new Conversation(f.matchId, f.a, f.b);
        UUID id = conversation.id();
        when(f.conversations.findById(id)).thenReturn(Optional.of(conversation));
        when(f.matches.activeCounterparts(f.a)).thenReturn(Set.of(f.b));
        when(f.messages.markRead(id, f.a)).thenReturn(2);

        int updated = f.service.markRead(f.a, id);

        assertEquals(2, updated);
        verify(f.ws).convertAndSend(eq("/topic/conversations/" + id + "/receipts"), any(MessagingService.ReadReceipt.class));
    }

    @Test
    void togglingHeartPersistsAndBroadcastsReaction() {
        Fixture f = new Fixture();
        Conversation conversation = new Conversation(f.matchId, f.a, f.b);
        UUID conversationId = conversation.id();
        Message message = new Message(conversationId, f.b, "oi");
        when(f.conversations.findById(conversationId)).thenReturn(Optional.of(conversation));
        when(f.matches.activeCounterparts(f.a)).thenReturn(Set.of(f.b));
        when(f.messages.findByIdAndConversationId(message.id(), conversationId)).thenReturn(Optional.of(message));
        when(f.reactions.hasHeart(message.id(), f.a)).thenReturn(false);
        when(f.reactions.addHeart(eq(message.id()), eq(f.a), any())).thenReturn(true);
        when(f.reactions.heartCount(message.id())).thenReturn(1);

        MessagingService.ReactionView result = f.service.toggleHeart(f.a, conversationId, message.id());

        assertTrue(result.heartReactedByMe());
        assertEquals(1, result.heartReactionCount());
        assertEquals(message.id(), result.messageId());
        verify(f.ws).convertAndSend(eq("/topic/conversations/" + conversationId + "/reactions"), any(MessagingService.ReactionEvent.class));
    }

    @Test
    void unmatchConversationDeniesHeartReaction() {
        Fixture f = new Fixture();
        Conversation conversation = new Conversation(f.matchId, f.a, f.b);
        UUID conversationId = conversation.id();
        Message message = new Message(conversationId, f.b, "oi");
        when(f.conversations.findById(conversationId)).thenReturn(Optional.of(conversation));
        when(f.matches.activeCounterparts(f.a)).thenReturn(Set.of());

        assertThrows(RuntimeException.class, () -> f.service.toggleHeart(f.a, conversationId, message.id()));
        verify(f.reactions, never()).addHeart(any(), any(), any());
        verify(f.reactions, never()).removeHeart(any(), any());
    }

    @Test
    void historySetsAllHeartReactionFields() {
        Fixture f = new Fixture();
        Conversation conversation = new Conversation(f.matchId, f.a, f.b);
        UUID conversationId = conversation.id();
        Message message = new Message(conversationId, f.b, "oi");
        when(f.conversations.findById(conversationId)).thenReturn(Optional.of(conversation));
        when(f.matches.activeCounterparts(f.a)).thenReturn(Set.of(f.b));
        when(f.messages.latest(eq(conversationId), any())).thenReturn(List.of(message));
        when(f.reactions.summaries(anyCollection(), eq(f.a))).thenReturn(Map.of(
            message.id(),
            new MessageReactionRepository.ReactionSummary(message.id(), 2, true)
        ));

        List<MessagingService.MessageView> result = f.service.history(f.a, conversationId, null, 20);

        assertEquals(1, result.size());
        MessagingService.MessageView view = result.getFirst();
        assertEquals(2, view.heartReactionCount());
        assertTrue(view.heartReactedByMe());
        assertEquals(message.id(), view.id());
        assertEquals(conversationId, view.conversationId());
        assertEquals(message.sender(), view.senderId());
    }

    @Test
    void inactiveMatchConversationIsNotListedAndCannotBeOpened() {
        Fixture f = new Fixture();
        Conversation conversation = new Conversation(f.matchId, f.a, f.b);
        when(f.conversations.findForUser(f.a)).thenReturn(List.of(conversation));
        when(f.matches.activeCounterparts(f.a)).thenReturn(Set.of());

        assertTrue(f.service.list(f.a).isEmpty());

        when(f.conversations.findById(conversation.id())).thenReturn(Optional.of(conversation));
        assertThrows(RuntimeException.class, () -> f.service.history(f.a, conversation.id(), null, 20));
    }

    @Test
    void sendingMessagePublishesRecipientNotificationEvent() {
        Fixture f = new Fixture();
        Conversation conversation = new Conversation(f.matchId, f.a, f.b);
        UUID id = conversation.id();
        when(f.conversations.findById(id)).thenReturn(Optional.of(conversation));
        when(f.matches.activeCounterparts(f.a)).thenReturn(Set.of(f.b));
        when(f.messages.save(any(Message.class))).thenAnswer(invocation -> invocation.getArgument(0));

        f.service.send(f.a, id, "Olá");

        ArgumentCaptor<Object> event = ArgumentCaptor.forClass(Object.class);
        verify(f.events).publishEvent(event.capture());
        assertInstanceOf(MessageSent.class, event.getValue());
        MessageSent sent = (MessageSent) event.getValue();
        assertEquals(f.b, sent.recipientId());
        assertEquals(id, sent.conversationId());
    }

    private static final class Fixture {
        final ConversationRepository conversations = mock(ConversationRepository.class);
        final MessageRepository messages = mock(MessageRepository.class);
        final MatchQuery matches = mock(MatchQuery.class);
        final MessageReactionRepository reactions = mock(MessageReactionRepository.class);
        final OutboxService outbox = mock(OutboxService.class);
        final SimpMessagingTemplate ws = mock(SimpMessagingTemplate.class);
        final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
        final MessagingService service = new MessagingService(conversations, messages, matches, reactions, outbox, ws, events);
        final UUID a = UUID.randomUUID();
        final UUID b = UUID.randomUUID();
        final UUID matchId = UUID.randomUUID();
    }
}
