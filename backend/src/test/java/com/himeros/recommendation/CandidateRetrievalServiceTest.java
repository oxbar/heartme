package com.himeros.recommendation;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.himeros.profile.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;

class CandidateRetrievalServiceTest {
    @Test
    void sparseNonStrictMarketExpandsGeoRetrievalInsteadOfReturningEmptyFeed() {
        ProfileQuery profiles = mock(ProfileQuery.class);
        CandidatePoolCache cache = mock(CandidatePoolCache.class);
        RecommendationProperties props = new RecommendationProperties();
        props.setPoolSize(1000);
        props.setNonStrictRadiusKm(250);
        props.setMaxRetrievalRadiusKm(1000);
        when(cache.get(anyString())).thenReturn(Optional.empty());

        var me = p(UUID.randomUUID(), false, false, 50);
        var farCandidate = p(UUID.randomUUID(), false, false, 100);
        when(profiles.candidatePool(eq(me.userId()), eq(me.latitude()), eq(me.longitude()), eq(250), eq(false), anyInt()))
            .thenReturn(List.of());
        when(profiles.candidatePool(eq(me.userId()), eq(me.latitude()), eq(me.longitude()), eq(1000), eq(false), anyInt()))
            .thenReturn(List.of(farCandidate));

        var result = new CandidateRetrievalService(profiles, cache, props).retrieve(me, 20);

        assertEquals(List.of(farCandidate), result);
        verify(profiles).candidatePool(eq(me.userId()), eq(me.latitude()), eq(me.longitude()), eq(1000), eq(false), anyInt());
    }

    @Test
    void globalModeDoesNotApplyGeoRadius() {
        ProfileQuery profiles = mock(ProfileQuery.class);
        CandidatePoolCache cache = mock(CandidatePoolCache.class);
        RecommendationProperties props = new RecommendationProperties();
        when(cache.get(anyString())).thenReturn(Optional.empty());
        var me = p(UUID.randomUUID(), true, true, 1);
        when(profiles.candidatePool(eq(me.userId()), eq(me.latitude()), eq(me.longitude()), isNull(), eq(true), anyInt()))
            .thenReturn(List.of());

        new CandidateRetrievalService(profiles, cache, props).retrieve(me, 20);

        verify(profiles).candidatePool(eq(me.userId()), eq(me.latitude()), eq(me.longitude()), isNull(), eq(true), anyInt());
    }

    private static ProfileQuery.ProfileView p(UUID id, boolean global, boolean strictDistance, int distance) {
        Instant now = Instant.parse("2026-08-19T12:00:00Z");
        return new ProfileQuery.ProfileView(id, "User", "Bio", LocalDate.of(1995, 1, 1), Gender.MAN, null,
            "Blumenau", "SC", "BR", -26.9, -49.0, 18, 99, distance, false, strictDistance, true, false, global,
            Set.of("tech"), Set.of(Gender.WOMAN), Set.of(), now.minus(Duration.ofDays(30)), now, now);
    }
}
