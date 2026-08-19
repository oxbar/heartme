package com.himeros.recommendation;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.himeros.interaction.InteractionQuery;
import com.himeros.profile.*;
import com.himeros.trustsafety.TrustSafetyQuery;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.Test;

class RecommendationServiceTest {

    @Test
    void excludesAlreadySeenUsers() {
        Fixture f = new Fixture();
        UUID me = UUID.randomUUID(), seen = UUID.randomUUID(), fresh = UUID.randomUUID();
        var pMe = p(me, "Me", Gender.MAN, Set.of(Gender.WOMAN));
        var pSeen = p(seen, "Seen", Gender.WOMAN, Set.of(Gender.MAN));
        var pFresh = p(fresh, "Fresh", Gender.WOMAN, Set.of(Gender.MAN));

        f.stub(me, pMe, List.of(pSeen, pFresh), Set.of(seen), Set.of());

        var result = f.service().discover(me, 20);

        assertEquals(1, result.size());
        assertEquals(fresh, result.getFirst().profile().userId());
    }

    @Test
    void viewerPreferencesControlFeedWithoutReciprocalCandidateFiltering() {
        Fixture f = new Fixture();
        UUID manId = UUID.randomUUID();
        UUID womanId = UUID.randomUUID();

        var man = p(manId, "Man", Gender.MAN, Set.of(Gender.WOMAN));
        // Simulates an old/default onboarding value on the candidate. This must
        // not hide her from a man whose own feed is configured to show women.
        var womanWithNonReciprocalPreference = p(womanId, "Woman", Gender.WOMAN, Set.of(Gender.WOMAN));

        f.stub(manId, man, List.of(womanWithNonReciprocalPreference), Set.of(), Set.of());

        var result = f.service().discover(manId, 20);

        assertEquals(1, result.size());
        assertEquals(womanId, result.getFirst().profile().userId());
    }

    @Test
    void twoAccountsCanDiscoverEachOtherUsingEachViewersOwnPreferences() {
        Fixture f = new Fixture();
        UUID manId = UUID.randomUUID();
        UUID womanId = UUID.randomUUID();

        var man = p(manId, "Man", Gender.MAN, Set.of(Gender.WOMAN));
        var woman = p(womanId, "Woman", Gender.WOMAN, Set.of(Gender.MAN));

        f.stub(manId, man, List.of(woman), Set.of(), Set.of());
        assertEquals(womanId, f.service().discover(manId, 20).getFirst().profile().userId());

        f.stub(womanId, woman, List.of(man), Set.of(), Set.of());
        assertEquals(manId, f.service().discover(womanId, 20).getFirst().profile().userId());
    }

    @Test
    void strictAgeAndDistanceApplyOnlyToViewerFeed() {
        Fixture f = new Fixture();
        UUID meId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();

        var me = p(meId, "Me", Gender.MAN, Set.of(Gender.WOMAN),
            25, 35, 5, true, true, false, true,
            -26.9000, -49.0000, null, Set.of());
        var farCandidate = p(candidateId, "Far", Gender.WOMAN, Set.of(Gender.MAN),
            18, 99, 500, false, false, false, true,
            -27.6000, -48.5500, null, Set.of());

        f.stub(meId, me, List.of(farCandidate), Set.of(), Set.of());

        assertTrue(f.service().discover(meId, 20).isEmpty());
    }

    @Test
    void globalModeBypassesStrictDistanceButKeepsOtherViewerFilters() {
        Fixture f = new Fixture();
        UUID meId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();

        var me = p(meId, "Me", Gender.MAN, Set.of(Gender.WOMAN),
            18, 99, 1, false, true, true, true,
            -26.9000, -49.0000, null, Set.of());
        var farCandidate = p(candidateId, "Far", Gender.WOMAN, Set.of(Gender.MAN),
            18, 99, 1, false, true, false, true,
            -23.5505, -46.6333, null, Set.of());

        f.stub(meId, me, List.of(farCandidate), Set.of(), Set.of());

        assertEquals(1, f.service().discover(meId, 20).size());
    }

    @Test
    void nonDiscoverableCandidateNeverAppears() {
        Fixture f = new Fixture();
        UUID meId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();

        var me = p(meId, "Me", Gender.MAN, Set.of(Gender.WOMAN));
        var hidden = p(candidateId, "Hidden", Gender.WOMAN, Set.of(Gender.MAN),
            18, 99, 100, false, false, false, false,
            -26.9, -49.0, null, Set.of());

        f.stub(meId, me, List.of(hidden), Set.of(), Set.of());

        assertTrue(f.service().discover(meId, 20).isEmpty());
    }

    private static ProfileQuery.ProfileView p(UUID id, String name, Gender gender, Set<Gender> lookingFor) {
        return p(id, name, gender, lookingFor,
            18, 99, 100, false, false, false, true,
            -26.9, -49.0, null, Set.of());
    }

    private static ProfileQuery.ProfileView p(
        UUID id,
        String name,
        Gender gender,
        Set<Gender> lookingFor,
        int minAge,
        int maxAge,
        int maxDistanceKm,
        boolean strictAge,
        boolean strictDistance,
        boolean globalMode,
        boolean discoverable,
        Double latitude,
        Double longitude,
        BodyType bodyType,
        Set<BodyType> preferredBodyTypes
    ) {
        return new ProfileQuery.ProfileView(
            id,
            name,
            null,
            LocalDate.now().minusYears(30),
            gender,
            bodyType,
            "Blumenau",
            "SC",
            "BR",
            latitude,
            longitude,
            minAge,
            maxAge,
            maxDistanceKm,
            strictAge,
            strictDistance,
            discoverable,
            false,
            globalMode,
            Set.of("java"),
            lookingFor,
            preferredBodyTypes
        );
    }

    private static final class Fixture {
        private final ProfileQuery profiles = mock(ProfileQuery.class);
        private final InteractionQuery interactions = mock(InteractionQuery.class);
        private final TrustSafetyQuery safety = mock(TrustSafetyQuery.class);

        RecommendationService service() {
            return new RecommendationService(profiles, interactions, safety);
        }

        void stub(
            UUID me,
            ProfileQuery.ProfileView self,
            List<ProfileQuery.ProfileView> candidates,
            Set<UUID> seen,
            Set<UUID> excluded
        ) {
            when(profiles.find(me)).thenReturn(Optional.of(self));
            when(profiles.candidatePool(eq(me), anyInt())).thenReturn(candidates);
            when(interactions.seenBy(me)).thenReturn(seen);
            when(safety.excluded(me)).thenReturn(excluded);
        }
    }
}
