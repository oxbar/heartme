package com.himeros.recommendation;

import com.himeros.interaction.InteractionQuery;
import com.himeros.match.MatchQuery;
import com.himeros.messaging.MessagingQuery;
import com.himeros.trustsafety.TrustSafetyQuery;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class BehaviorSignalService {
    private final InteractionQuery interactions;
    private final MatchQuery matches;
    private final MessagingQuery messaging;
    private final TrustSafetyQuery safety;

    public BehaviorSignalService(InteractionQuery interactions, MatchQuery matches, MessagingQuery messaging, TrustSafetyQuery safety) {
        this.interactions = interactions; this.matches = matches; this.messaging = messaging; this.safety = safety;
    }

    public List<BehaviorSignal> recent(UUID userId, int limit) {
        int sourceLimit = Math.max(20, Math.min(limit, 500));
        List<BehaviorSignal> signals = new ArrayList<>();
        interactions.recentBy(userId, sourceLimit).forEach(i -> signals.add(new BehaviorSignal(i.targetId(), BehaviorSignalType.valueOf(i.type()), i.createdAt())));
        matches.behaviorSignals(userId, sourceLimit).forEach(s -> signals.add(new BehaviorSignal(s.targetId(), BehaviorSignalType.valueOf(s.type()), s.occurredAt())));
        messaging.engagementSignals(userId, sourceLimit).forEach(s -> signals.add(new BehaviorSignal(s.targetId(), BehaviorSignalType.valueOf(s.type()), s.occurredAt())));
        safety.behaviorSignals(userId, sourceLimit).forEach(s -> signals.add(new BehaviorSignal(s.targetId(), BehaviorSignalType.valueOf(s.type()), s.occurredAt())));
        signals.sort(Comparator.comparing(BehaviorSignal::occurredAt).reversed());
        return signals.stream().limit(limit).toList();
    }
}
