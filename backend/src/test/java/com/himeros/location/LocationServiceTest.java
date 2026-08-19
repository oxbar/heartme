package com.himeros.location;

import static org.junit.jupiter.api.Assertions.*;

import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

class LocationServiceTest {
    @Test
    void exposesAllBrazilianFederativeUnitsWithoutDependingOnRemoteApi() {
        LocationService service = new LocationService();

        var states = service.states();

        assertEquals(27, states.size());
        Set<String> codes = states.stream().map(LocationService.StateView::code).collect(Collectors.toSet());
        assertEquals(27, codes.size());
        assertTrue(codes.containsAll(Set.of("AC", "AM", "BA", "DF", "MG", "PR", "RJ", "RS", "SC", "SP")));
        assertEquals("Acre", states.getFirst().name());
        assertEquals("Tocantins", states.getLast().name());
    }

    @Test
    void rejectsUnknownStateBeforeCallingIbge() {
        LocationService service = new LocationService();
        assertThrows(IllegalArgumentException.class, () -> service.cities("Estado Inexistente"));
    }
}
