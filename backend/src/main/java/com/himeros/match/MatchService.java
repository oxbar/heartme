package com.himeros.match;

import com.himeros.interaction.InteractionQuery;
import com.himeros.shared.*;
import com.himeros.shared.outbox.OutboxService;
import java.time.Instant;
import java.util.*;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MatchService implements MatchQuery {
    private final MatchRepository repo;
    private final OutboxService outbox;
    private final ApplicationEventPublisher events;
    private final InteractionQuery interactions;

    public MatchService(MatchRepository repo, OutboxService outbox, ApplicationEventPublisher events,
            InteractionQuery interactions) {
        this.repo = repo;
        this.outbox = outbox;
        this.events = events;
        this.interactions = interactions;
    }

    /**
     * Re-checks both directions from committed interaction state. REQUIRES_NEW is
     * deliberate: this method is called by an AFTER_COMMIT listener.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<MatchView> reconcile(UUID x, UUID y) {
        if (x == null || y == null || x.equals(y))
            return Optional.empty();
        if (!latestDecisionIsPositive(x, y) || !latestDecisionIsPositive(y, x))
            return Optional.empty();
        return Optional.of(activatePair(x, y));
    }

    @Transactional
    public MatchView create(UUID x, UUID y) {
        if (x.equals(y))
            throw new IllegalArgumentException("Cannot match a user with themselves");
        return activatePair(x, y);
    }

    @Transactional(readOnly = true)
    public List<MatchView> list(UUID user) {
        return repo.findForUserByStatus(user, Match.Status.ACTIVE).stream().map(MatchService::view).toList();
    }

    @Transactional
    public void unmatch(UUID user, UUID id) {
        Match m = repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Match not found"));
        if (!m.a().equals(user) && !m.b().equals(user))
            throw new ForbiddenException("Not your match");
        m.unmatch();
    }

    @Override
    @Transactional(readOnly = true)
    public Set<UUID> activeCounterparts(UUID userId) {
        return Set.copyOf(repo.counterpartsByStatus(userId, Match.Status.ACTIVE));
    }

    @Override
    @Transactional(readOnly = true)
    public Set<UUID> unmatchedSince(UUID userId, Instant since) {
        return Set.copyOf(repo.unmatchedCounterpartsSince(userId, Match.Status.UNMATCHED, since));
    }

    @Override
    @Transactional(readOnly = true)
    public List<MatchSignal> behaviorSignals(UUID userId, int limit) {
        int cap = Math.max(1, Math.min(limit, 200));
        return repo.findSignalsForUser(userId, PageRequest.of(0, cap)).stream().map(match -> {
            UUID target = counterpart(match, userId);
            if (match.status() == Match.Status.UNMATCHED && match.unmatchedAt() != null)
                return new MatchSignal(target, "UNMATCH", match.unmatchedAt());
            return new MatchSignal(target, "MATCH", match.createdAt());
        }).toList();
    }

    private MatchView activatePair(UUID x, UUID y) {
        UUID a = first(x, y);
        UUID b = a.equals(x) ? y : x;
        Instant now = Instant.now();

        int changed = repo.reactivatePair(a, b, now);
        if (changed == 0) {
            changed = repo.insertActiveIfAbsent(UUID.randomUUID(), a, b, now);
        }

        Match current = repo.findByUserAAndUserB(a, b)
                .orElseThrow(() -> new IllegalStateException("Match activation did not persist"));

        // Only the transaction that actually inserted/reactivated emits MatchCreated.
        // The UNIQUE(user_a,user_b) constraint + ON CONFLICT makes concurrent LIKEs idempotent.
        if (changed > 0) {
            publishCreated(current);
        }
        return view(current);
    }

    private boolean latestDecisionIsPositive(UUID actor, UUID target) {
        return interactions.find(actor, target)
                .map(InteractionQuery.InteractionView::type)
                .map(MatchService::isPositive)
                .orElse(false);
    }

    private static boolean isPositive(String type) {
        return "LIKE".equals(type) || "SUPER_LIKE".equals(type);
    }

    private static UUID first(UUID x, UUID y) {
        return x.toString().compareTo(y.toString()) < 0 ? x : y;
    }

    private void publishCreated(Match match) {
        MatchCreated event = new MatchCreated(match.id(), match.a(), match.b(), Instant.now());
        events.publishEvent(event);
        outbox.append("Match", match.id(), "himeros.match.created.v1", "himeros.match.events.v1", match.id(), event);
    }

    private static UUID counterpart(Match match, UUID userId) {
        return match.a().equals(userId) ? match.b() : match.a();
    }

    static MatchView view(Match m) {
        return new MatchView(m.id(), m.a(), m.b(), m.status().name(), m.createdAt());
    }

    public record MatchView(UUID id, UUID userA, UUID userB, String status, Instant createdAt) {
    }
}
