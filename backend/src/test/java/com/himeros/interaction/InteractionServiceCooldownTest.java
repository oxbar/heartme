package com.himeros.interaction;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.himeros.identity.IdentityLookup;
import com.himeros.shared.DiscoveryCooldownProperties;
import com.himeros.shared.outbox.OutboxService;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

class InteractionServiceCooldownTest {
    @Test
    void viewCannotWeakenAnActiveLikeCooldown() {
        InteractionRepository repo = mock(InteractionRepository.class);
        IdentityLookup identity = mock(IdentityLookup.class);
        ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
        OutboxService outbox = mock(OutboxService.class);
        DiscoveryCooldownProperties cooldowns = new DiscoveryCooldownProperties();
        InteractionService service = new InteractionService(repo, identity, events, outbox, cooldowns);
        UUID actor = UUID.randomUUID(), target = UUID.randomUUID();
        Interaction like = mock(Interaction.class);
        when(identity.exists(target)).thenReturn(true);
        when(like.type()).thenReturn(Interaction.Type.LIKE);
        when(like.createdAt()).thenReturn(Instant.now().minus(2, ChronoUnit.DAYS));
        when(repo.findFirstByActorIdAndTargetIdOrderByCreatedAtDesc(actor, target)).thenReturn(Optional.of(like));

        service.recordView(actor, target);

        verify(repo, never()).save(any());
    }

    @Test
    void viewIsRecordedAfterPreviousDecisionCooldownExpires() {
        InteractionRepository repo = mock(InteractionRepository.class);
        IdentityLookup identity = mock(IdentityLookup.class);
        ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
        OutboxService outbox = mock(OutboxService.class);
        DiscoveryCooldownProperties cooldowns = new DiscoveryCooldownProperties();
        InteractionService service = new InteractionService(repo, identity, events, outbox, cooldowns);
        UUID actor = UUID.randomUUID(), target = UUID.randomUUID();
        Interaction pass = mock(Interaction.class);
        when(identity.exists(target)).thenReturn(true);
        when(pass.type()).thenReturn(Interaction.Type.PASS);
        when(pass.createdAt()).thenReturn(Instant.now().minus(20, ChronoUnit.DAYS));
        when(repo.findFirstByActorIdAndTargetIdOrderByCreatedAtDesc(actor, target)).thenReturn(Optional.of(pass));

        service.recordView(actor, target);

        verify(repo).save(any(Interaction.class));
    }
}
