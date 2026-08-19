package com.himeros.match;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.himeros.interaction.InteractionQuery;
import com.himeros.shared.outbox.OutboxService;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;

class MatchServiceTest {

    @Test
    void reconcileCreatesMatchWhenBothLatestDecisionsArePositive() {
        Fixture f = new Fixture();
        f.positiveBothDirections();
        when(f.repo.reactivatePair(any(), any(), any())).thenReturn(0);
        when(f.repo.insertActiveIfAbsent(any(), any(), any(), any())).thenReturn(1);
        Match persisted = new Match(f.a, f.b);
        when(f.repo.findByUserAAndUserB(any(), any())).thenReturn(Optional.of(persisted));

        Optional<MatchService.MatchView> result = f.service.reconcile(f.a, f.b);

        assertTrue(result.isPresent());
        assertEquals("ACTIVE", result.orElseThrow().status());
        verify(f.repo).insertActiveIfAbsent(any(), any(), any(), any());
        ArgumentCaptor<Object> event = ArgumentCaptor.forClass(Object.class);
        verify(f.events).publishEvent(event.capture());
        assertInstanceOf(MatchCreated.class, event.getValue());
    }

    @Test
    void reconcileDoesNothingWhenReverseDecisionIsNotPositive() {
        Fixture f = new Fixture();
        when(f.interactions.find(f.a, f.b)).thenReturn(Optional.of(f.view(f.b, "LIKE")));
        when(f.interactions.find(f.b, f.a)).thenReturn(Optional.of(f.view(f.a, "PASS")));

        Optional<MatchService.MatchView> result = f.service.reconcile(f.a, f.b);

        assertTrue(result.isEmpty());
        verify(f.repo, never()).reactivatePair(any(), any(), any());
        verify(f.repo, never()).insertActiveIfAbsent(any(), any(), any(), any());
        verify(f.events, never()).publishEvent(any(MatchCreated.class));
    }

    @Test
    void concurrentDuplicateActivationDoesNotPublishDuplicateMatchCreated() {
        Fixture f = new Fixture();
        f.positiveBothDirections();
        Match existing = new Match(f.a, f.b);
        when(f.repo.reactivatePair(any(), any(), any())).thenReturn(0);
        when(f.repo.insertActiveIfAbsent(any(), any(), any(), any())).thenReturn(0);
        when(f.repo.findByUserAAndUserB(any(), any())).thenReturn(Optional.of(existing));

        Optional<MatchService.MatchView> result = f.service.reconcile(f.a, f.b);

        assertTrue(result.isPresent());
        verify(f.events, never()).publishEvent(any(MatchCreated.class));
    }

    @Test
    void listReturnsOnlyActiveMatches() {
        Fixture f = new Fixture();
        Match active = new Match(f.a, f.b);
        when(f.repo.findForUserByStatus(f.a, Match.Status.ACTIVE)).thenReturn(List.of(active));

        List<MatchService.MatchView> result = f.service.list(f.a);

        assertEquals(1, result.size());
        assertEquals("ACTIVE", result.getFirst().status());
        verify(f.repo).findForUserByStatus(f.a, Match.Status.ACTIVE);
    }

    @Test
    void shouldReturnActiveMatchOnRepeatedQueries() {
        Fixture f = new Fixture();
        Match active = new Match(f.a, f.b);
        when(f.repo.findForUserByStatus(f.a, Match.Status.ACTIVE)).thenReturn(List.of(active));

        List<MatchService.MatchView> first = f.service.list(f.a);
        List<MatchService.MatchView> second = f.service.list(f.a);
        List<MatchService.MatchView> third = f.service.list(f.a);

        assertEquals(1, first.size());
        assertEquals(1, second.size());
        assertEquals(1, third.size());
        assertEquals("ACTIVE", first.getFirst().status());
        assertEquals("ACTIVE", second.getFirst().status());
        assertEquals("ACTIVE", third.getFirst().status());
        verify(f.repo, times(3)).findForUserByStatus(f.a, Match.Status.ACTIVE);
    }

    @Test
    void shouldKeepActiveMatchWhenLoadingConversationsSideEffects() {
        Fixture f = new Fixture();
        Match active = new Match(f.a, f.b);
        when(f.repo.findForUserByStatus(f.a, Match.Status.ACTIVE)).thenReturn(List.of(active));

        List<MatchService.MatchView> beforeConversations = f.service.list(f.a);
        assertEquals(1, beforeConversations.size());
        assertEquals("ACTIVE", beforeConversations.getFirst().status());

        verify(f.repo, never()).save(any());
        verify(f.repo, never()).reactivatePair(any(), any(), any());
        verify(f.repo, never()).insertActiveIfAbsent(any(), any(), any(), any());

        List<MatchService.MatchView> afterConversations = f.service.list(f.a);
        assertEquals(1, afterConversations.size());
        assertEquals("ACTIVE", afterConversations.getFirst().status());

        verify(f.events, never()).publishEvent(any());
    }

    private static final class Fixture {
        final MatchRepository repo = mock(MatchRepository.class);
        final OutboxService outbox = mock(OutboxService.class);
        final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
        final InteractionQuery interactions = mock(InteractionQuery.class);
        final MatchService service = new MatchService(repo, outbox, events, interactions);
        final UUID a = UUID.randomUUID();
        final UUID b = UUID.randomUUID();

        void positiveBothDirections() {
            when(interactions.find(a, b)).thenReturn(Optional.of(view(b, "LIKE")));
            when(interactions.find(b, a)).thenReturn(Optional.of(view(a, "SUPER_LIKE")));
        }

        InteractionQuery.InteractionView view(UUID target, String type) {
            return new InteractionQuery.InteractionView(target, type, Instant.now());
        }
    }
}
