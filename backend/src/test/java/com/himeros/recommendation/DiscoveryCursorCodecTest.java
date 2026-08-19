package com.himeros.recommendation;

import static org.junit.jupiter.api.Assertions.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class DiscoveryCursorCodecTest {
    private final DiscoveryCursorCodec codec = new DiscoveryCursorCodec();

    @Test void roundTripsOpaqueCursor() {
        UUID id = UUID.randomUUID();
        assertEquals(id, codec.decode(codec.encode(id)).orElseThrow());
    }

    @Test void invalidCursorDoesNotCrashFeed() {
        assertTrue(codec.decode("not-a-valid-cursor").isEmpty());
    }
}
