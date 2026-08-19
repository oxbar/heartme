package com.himeros.interaction;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.himeros.identity.IdentityLookup;
import com.himeros.shared.DiscoveryCooldownProperties;
import com.himeros.shared.outbox.OutboxService;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;

class InteractionServiceMatchTest {

    @Test
    void positiveInteractionAlwaysPublishesPostCommitReconciliationSignal() {
        Fixture f = new Fixture();
        when(f.identity.exists(f.target)).thenReturn(true);
        when(f.repo.findFirstByActorIdAndTargetIdOrderByCreatedAtDesc(f.target, f.actor))
                .thenReturn(Optional.empty());

        InteractionService.Result result = f.service.interact(f.actor, f.target, "LIKE");

        assertFalse(result.mutualLike());
        ArgumentCaptor<Object> event = ArgumentCaptor.forClass(Object.class);
        verify(f.events).publishEvent(event.capture());
        PositiveInteractionRecorded recorded = assertInstanceOf(PositiveInteractionRecorded.class, event.getValue());
        assertEquals(f.actor, recorded.actorId());
        assertEquals(f.target, recorded.targetId());
        assertEquals("LIKE", recorded.type());
    }

    @Test
    void reciprocalPositiveDecisionIsReturnedAsMutualImmediately() {
        Fixture f = new Fixture();
        when(f.identity.exists(f.target)).thenReturn(true);
        Interaction reverse = mock(Interaction.class);
        when(reverse.type()).thenReturn(Interaction.Type.SUPER_LIKE);
        when(reverse.createdAt()).thenReturn(Instant.now());
        when(f.repo.findFirstByActorIdAndTargetIdOrderByCreatedAtDesc(f.target, f.actor))
                .thenReturn(Optional.of(reverse));

        InteractionService.Result result = f.service.interact(f.actor, f.target, "LIKE");

        assertTrue(result.mutualLike());
        verify(f.events).publishEvent(any(PositiveInteractionRecorded.class));
    }

    @Test
    void passNeverPublishesMatchReconciliationSignal() {
        Fixture f = new Fixture();
        when(f.identity.exists(f.target)).thenReturn(true);

        InteractionService.Result result = f.service.interact(f.actor, f.target, "PASS");

        assertFalse(result.mutualLike());
        verify(f.events, never()).publishEvent(any(PositiveInteractionRecorded.class));
    }

    private static final class Fixture {
        final InteractionRepository repo = mock(InteractionRepository.class);
        final IdentityLookup identity = mock(IdentityLookup.class);
        final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
        final OutboxService outbox = mock(OutboxService.class);
        final DiscoveryCooldownProperties cooldowns = new DiscoveryCooldownProperties();
        final InteractionService service = new InteractionService(repo, identity, events, outbox, cooldowns);
        final UUID actor = UUID.randomUUID();
        final UUID target = UUID.randomUUID();
    }
}
