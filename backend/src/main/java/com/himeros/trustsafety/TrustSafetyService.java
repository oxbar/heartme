package com.himeros.trustsafety;

import com.himeros.shared.outbox.OutboxService;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TrustSafetyService implements TrustSafetyQuery {
    private final BlockRepository blocks;
    private final ReportRepository reports;
    private final OutboxService outbox;

    public TrustSafetyService(BlockRepository blocks, ReportRepository reports, OutboxService outbox) {
        this.blocks = blocks; this.reports = reports; this.outbox = outbox;
    }

    @Transactional
    public void block(UUID actor, UUID target) {
        if (actor.equals(target)) throw new IllegalArgumentException("Cannot block yourself");
        if (!blocks.existsByBlockerAndBlocked(actor, target)) {
            blocks.save(new Block(actor, target));
            outbox.append("Block", actor + ":" + target, "himeros.trust.user-blocked.v1", "himeros.trust.events.v1", actor,
                Map.of("blockerId", actor, "blockedId", target));
        }
    }

    @Transactional public void unblock(UUID actor, UUID target) { blocks.deleteByBlockerAndBlocked(actor, target); }

    @Transactional
    public UUID report(UUID actor, UUID target, String reason, String details) {
        if (actor.equals(target)) throw new IllegalArgumentException("Cannot report yourself");
        return reports.save(new Report(actor, target, reason, details)).id();
    }

    @Override @Transactional(readOnly = true)
    public boolean blockedEitherWay(UUID a, UUID b) {
        return blocks.existsByBlockerAndBlocked(a, b) || blocks.existsByBlockerAndBlocked(b, a);
    }

    @Override @Transactional(readOnly = true)
    public Set<UUID> excluded(UUID user) {
        Set<UUID> excluded = new HashSet<>(blocks.blockedBy(user));
        excluded.addAll(blocks.blockedMe(user));
        excluded.addAll(reports.reportedBy(user));
        // A report is a safety boundary in both directions to avoid resurfacing or retaliation.
        excluded.addAll(reports.reportedMe(user));
        return excluded;
    }

    @Override @Transactional(readOnly = true)
    public List<SafetySignal> behaviorSignals(UUID user, int limit) {
        int cap = Math.max(1, Math.min(limit, 200));
        List<SafetySignal> result = new ArrayList<>();
        blocks.recordsBy(user, PageRequest.of(0, cap)).forEach(b -> result.add(new SafetySignal(b.blocked(), "BLOCK", b.created())));
        reports.recordsBy(user, PageRequest.of(0, cap)).forEach(r -> result.add(new SafetySignal(r.reported(), "REPORT", r.created())));
        result.sort(Comparator.comparing(SafetySignal::occurredAt).reversed());
        return result.stream().limit(cap).toList();
    }
}
