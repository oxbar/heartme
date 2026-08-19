package com.himeros.match;

import static org.junit.jupiter.api.Assertions.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class MatchLifecycleTest {
    @Test
    void unmatchedPairCanBeReactivatedAfterDiscoveryCooldown() {
        Match match = new Match(UUID.randomUUID(), UUID.randomUUID());
        match.unmatch();
        assertEquals(Match.Status.UNMATCHED, match.status());
        assertNotNull(match.unmatchedAt());

        match.reactivate();
        assertEquals(Match.Status.ACTIVE, match.status());
        assertNull(match.unmatchedAt());
    }
}
