package com.himeros.match;

import static org.mockito.Mockito.*;

import com.himeros.interaction.PositiveInteractionRecorded;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class MatchReconciliationListenerTest {
    @Test
    void delegatesCommittedPositiveInteractionToReconciliation() {
        MatchService service = mock(MatchService.class);
        MatchReconciliationListener listener = new MatchReconciliationListener(service);
        UUID a = UUID.randomUUID(), b = UUID.randomUUID();

        listener.on(new PositiveInteractionRecorded(a, b, "LIKE"));

        verify(service).reconcile(a, b);
    }
}
