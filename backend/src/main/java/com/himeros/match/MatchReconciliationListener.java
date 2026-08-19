package com.himeros.match;

import com.himeros.interaction.PositiveInteractionRecorded;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Reconciles reciprocal likes only after the interaction transaction committed.
 * This is the important ordering guarantee for two independent browser sessions.
 */
@Component
public class MatchReconciliationListener {
    private final MatchService matches;

    public MatchReconciliationListener(MatchService matches) {
        this.matches = matches;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(PositiveInteractionRecorded event) {
        matches.reconcile(event.actorId(), event.targetId());
    }
}
