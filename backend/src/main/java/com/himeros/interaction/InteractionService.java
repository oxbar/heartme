package com.himeros.interaction;

import com.himeros.identity.IdentityLookup;
import com.himeros.shared.*;
import com.himeros.shared.outbox.OutboxService;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InteractionService implements InteractionQuery {
    private final InteractionRepository repo;
    private final IdentityLookup identity;
    private final ApplicationEventPublisher events;
    private final OutboxService outbox;
    private final DiscoveryCooldownProperties cooldowns;

    public InteractionService(InteractionRepository repo, IdentityLookup identity, ApplicationEventPublisher events,
            OutboxService outbox, DiscoveryCooldownProperties cooldowns) {
        this.repo = repo;
        this.identity = identity;
        this.events = events;
        this.outbox = outbox;
        this.cooldowns = cooldowns;
    }

    @Transactional
    public Result interact(UUID actor, UUID target, String rawType) {
        if (actor.equals(target))
            throw new IllegalArgumentException("Cannot interact with yourself");
        if (!identity.exists(target))
            throw new ResourceNotFoundException("Target user not found");
        Interaction.Type type = Interaction.Type.valueOf(rawType.toUpperCase());
        if (type == Interaction.Type.VIEW)
            throw new IllegalArgumentException("Use discovery view endpoint");

        repo.save(new Interaction(actor, target, type));
        boolean mutual = false;
        if (type == Interaction.Type.LIKE || type == Interaction.Type.SUPER_LIKE) {
            mutual = repo.findFirstByActorIdAndTargetIdOrderByCreatedAtDesc(target, actor)
                    .map(other -> other.type() == Interaction.Type.LIKE || other.type() == Interaction.Type.SUPER_LIKE)
                    .orElse(false);
            if (mutual)
                events.publishEvent(new MutualLikeDetected(actor, target));
        }
        outbox.append("Interaction", actor + ":" + target, "himeros.interaction.created.v1",
                "himeros.interaction.events.v1", actor,
                Map.of("actorId", actor, "targetId", target, "type", type.name(), "mutual", mutual));
        return new Result(type.name(), mutual);
    }

    @Transactional
    public void recordView(UUID actor, UUID target) {
        if (actor.equals(target))
            return;
        if (!identity.exists(target))
            throw new ResourceNotFoundException("Target user not found");
        Instant now = Instant.now();
        Optional<Interaction> latest = repo.findFirstByActorIdAndTargetIdOrderByCreatedAtDesc(actor, target);
        if (latest.isPresent()) {
            Interaction previous = latest.get();
            Duration activeCooldown = cooldowns.forType(previous.type().name());
            if (!activeCooldown.isZero() && now.isBefore(previous.createdAt().plus(activeCooldown)))
                return;
        }
        repo.save(new Interaction(actor, target, Interaction.Type.VIEW));
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasSeen(UUID actor, UUID target) {
        return repo.findFirstByActorIdAndTargetIdOrderByCreatedAtDesc(actor, target).isPresent();
    }

    @Override
    @Transactional(readOnly = true)
    public Set<UUID> seenBy(UUID actor) {
        return repo.targets(actor);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<InteractionView> find(UUID actor, UUID target) {
        return repo.findFirstByActorIdAndTargetIdOrderByCreatedAtDesc(actor, target).map(InteractionService::view);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InteractionView> recentBy(UUID actor, int limit) {
        return repo.findByActorIdOrderByCreatedAtDesc(actor, PageRequest.of(0, Math.max(1, Math.min(limit, 1000))))
                .stream().map(InteractionService::view).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Map<UUID, InteractionView> latestBy(UUID actor, Collection<UUID> targets) {
        if (targets == null || targets.isEmpty())
            return Map.of();
        Map<UUID, InteractionView> result = new HashMap<>();
        for (Interaction interaction : repo.latestForTargets(actor, targets))
            result.put(interaction.targetId(), view(interaction));
        return Map.copyOf(result);
    }

    private static InteractionView view(Interaction i) {
        return new InteractionView(i.targetId(), i.type().name(), i.createdAt());
    }

    public record Result(String type, boolean mutualLike) {
    }
}
