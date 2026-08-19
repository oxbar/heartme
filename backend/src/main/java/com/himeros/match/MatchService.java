package com.himeros.match;

import com.himeros.interaction.MutualLikeDetected;
import com.himeros.shared.*;
import com.himeros.shared.outbox.OutboxService;
import java.time.Instant;
import java.util.*;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MatchService implements MatchQuery {
    private final MatchRepository repo;
    private final OutboxService outbox;
    private final ApplicationEventPublisher events;

    public MatchService(MatchRepository repo, OutboxService outbox, ApplicationEventPublisher events) {
        this.repo = repo; this.outbox = outbox; this.events = events;
    }

    @EventListener public void on(MutualLikeDetected e) { create(e.userA(), e.userB()); }

    @Transactional
    public MatchView create(UUID x, UUID y) {
        UUID a = x.toString().compareTo(y.toString()) < 0 ? x : y, b = a.equals(x) ? y : x;
        Optional<Match> existing = repo.findByUserAAndUserB(a, b);
        if (existing.isPresent()) {
            Match current = existing.get();
            if (current.status() == Match.Status.ACTIVE) return view(current);
            current.reactivate();
            publishCreated(current);
            return view(current);
        }
        Match m = repo.save(new Match(a, b));
        publishCreated(m);
        return view(m);
    }

    @Transactional(readOnly = true)
    public List<MatchView> list(UUID user) { return repo.findForUser(user).stream().map(MatchService::view).toList(); }

    @Transactional
    public void unmatch(UUID user, UUID id) {
        Match m = repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Match not found"));
        if (!m.a().equals(user) && !m.b().equals(user)) throw new ForbiddenException("Not your match");
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


    private void publishCreated(Match match) {
        MatchCreated event = new MatchCreated(match.id(), match.a(), match.b(), Instant.now());
        events.publishEvent(event);
        outbox.append("Match", match.id(), "himeros.match.created.v1", "himeros.match.events.v1", match.id(), event);
    }

    private static UUID counterpart(Match match, UUID userId) { return match.a().equals(userId) ? match.b() : match.a(); }
    static MatchView view(Match m) { return new MatchView(m.id(), m.a(), m.b(), m.status().name(), m.createdAt()); }
    public record MatchView(UUID id, UUID userA, UUID userB, String status, Instant createdAt) {}
}
