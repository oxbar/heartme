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
