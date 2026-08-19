package com.himeros.recommendation;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.himeros.interaction.InteractionQuery;
import com.himeros.match.MatchQuery;
import com.himeros.profile.*;
import com.himeros.trustsafety.TrustSafetyQuery;
import com.himeros.shared.DiscoveryCooldownProperties;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;

class RecommendationServiceTest {
    private static final Instant NOW = Instant.parse("2026-08-19T12:00:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    @Test
    void twoBrowsersCanDiscoverEachOtherUsingViewerPreferencesOnly() {
        Fixture f = new Fixture();
        UUID manId = UUID.randomUUID(), womanId = UUID.randomUUID();
        var man = p(manId, "Man", Gender.MAN, Set.of(Gender.WOMAN), BodyType.ATHLETIC, true);
        // Candidate preference is intentionally non-reciprocal. It must not control the man's feed.
        var woman = p(womanId, "Woman", Gender.WOMAN, Set.of(Gender.WOMAN), BodyType.SLIM, true);

        f.stub(manId, man, List.of(woman), List.of());
        assertEquals(womanId, f.service.discover(manId, 20).getFirst().profile().userId());

        var womanLookingForMan = withLookingFor(woman, Set.of(Gender.MAN));
        f.stub(womanId, womanLookingForMan, List.of(man), List.of());
        assertEquals(manId, f.service.discover(womanId, 20).getFirst().profile().userId());
    }


    @Test
    void merelyViewingCandidateDoesNotConsumeItFromDiscovery() {
        Fixture f = new Fixture();
        UUID meId = UUID.randomUUID(), candidateId = UUID.randomUUID();
        var me = p(meId, "Me", Gender.MAN, Set.of(Gender.WOMAN), null, true);
        var candidate = p(candidateId, "Candidate", Gender.WOMAN, Set.of(Gender.MAN), null, true);

        f.stub(meId, me, List.of(candidate), List.of(
            new InteractionQuery.InteractionView(candidateId, "VIEW", NOW.minus(Duration.ofMinutes(1)))
        ));

        var result = f.service.discover(meId, 20);
        assertEquals(1, result.size());
        assertEquals(candidateId, result.getFirst().profile().userId());
        assertTrue(f.service.explain(meId, candidateId).eligible());
    }

    @Test
    void passUsesCooldownInsteadOfPermanentSeenExclusion() {
        Fixture f = new Fixture();
        UUID meId = UUID.randomUUID(), candidateId = UUID.randomUUID();
        var me = p(meId, "Me", Gender.MAN, Set.of(Gender.WOMAN), null, true);
        var candidate = p(candidateId, "Candidate", Gender.WOMAN, Set.of(Gender.MAN), null, true);

        f.stub(meId, me, List.of(candidate), List.of(new InteractionQuery.InteractionView(candidateId, "PASS", NOW.minus(Duration.ofDays(3)))));
        assertTrue(f.service.discover(meId, 20).isEmpty());
        assertEquals("INTERACTION_COOLDOWN", f.service.explain(meId, candidateId).excludedBy());

        f.stub(meId, me, List.of(candidate), List.of(new InteractionQuery.InteractionView(candidateId, "PASS", NOW.minus(Duration.ofDays(20)))));
        assertEquals(1, f.service.discover(meId, 20).size());
    }

    @Test
    void activeMatchIsNeverReturnedAndRecentUnmatchIsCooledDown() {
        Fixture f = new Fixture();
        UUID meId = UUID.randomUUID(), candidateId = UUID.randomUUID();
        var me = p(meId, "Me", Gender.MAN, Set.of(Gender.WOMAN), null, true);
        var candidate = p(candidateId, "Candidate", Gender.WOMAN, Set.of(Gender.MAN), null, true);
        f.stub(meId, me, List.of(candidate), List.of());

        when(f.matches.activeCounterparts(meId)).thenReturn(Set.of(candidateId));
        assertEquals("ACTIVE_MATCH", f.service.explain(meId, candidateId).excludedBy());

        when(f.matches.activeCounterparts(meId)).thenReturn(Set.of());
        when(f.matches.unmatchedSince(eq(meId), any())).thenReturn(Set.of(candidateId));
        assertEquals("UNMATCH_COOLDOWN", f.service.explain(meId, candidateId).excludedBy());
    }

    @Test
    void preferredBodyTypeIsSoftRankingSignalNotHardExclusion() {
        Fixture f = new Fixture();
        UUID meId = UUID.randomUUID(), candidateId = UUID.randomUUID();
        var me = withPreferredBodyTypes(p(meId, "Me", Gender.MAN, Set.of(Gender.WOMAN), BodyType.ATHLETIC, true), Set.of(BodyType.ATHLETIC));
        var slimCandidate = p(candidateId, "Slim", Gender.WOMAN, Set.of(Gender.MAN), BodyType.SLIM, true);
        f.stub(meId, me, List.of(slimCandidate), List.of());

        var result = f.service.discover(meId, 20);
        assertEquals(1, result.size());
        assertEquals(candidateId, result.getFirst().profile().userId());
    }

    @Test
    void globalModeBypassesStrictDistance() {
        Fixture f = new Fixture();
        UUID meId = UUID.randomUUID(), candidateId = UUID.randomUUID();
        var me = p(meId, "Me", Gender.MAN, Set.of(Gender.WOMAN), null, true,
            18, 99, 1, false, true, true, -26.9, -49.0);
        var far = p(candidateId, "Far", Gender.WOMAN, Set.of(Gender.MAN), null, true,
            18, 99, 100, false, false, false, -23.55, -46.63);
        f.stub(meId, me, List.of(far), List.of());
        assertEquals(1, f.service.discover(meId, 20).size());
    }

    @Test
    void strictAgeStillWorksAsHardEligibilityRule() {
        Fixture f = new Fixture();
        UUID meId = UUID.randomUUID(), candidateId = UUID.randomUUID();
        var me = p(meId, "Me", Gender.MAN, Set.of(Gender.WOMAN), null, true,
            25, 30, 100, true, false, false, -26.9, -49.0);
        var older = new ProfileQuery.ProfileView(candidateId, "Older", "Bio longa o suficiente para qualidade", NOW.atZone(ZoneOffset.UTC).toLocalDate().minusYears(40),
            Gender.WOMAN, BodyType.ATHLETIC, "Blumenau", "SC", "BR", -26.91, -49.01,
            18, 99, 100, false, false, true, false, false, Set.of("java", "trilhas"), Set.of(Gender.MAN), Set.of(),
            NOW.minus(Duration.ofDays(100)), NOW.minus(Duration.ofHours(1)), NOW.minus(Duration.ofHours(1)));
        f.stub(meId, me, List.of(older), List.of());
        assertEquals("STRICT_AGE", f.service.explain(meId, candidateId).excludedBy());
    }

    @Test
    void explainReturnsFeatureBreakdownForEligibleCandidate() {
        Fixture f = new Fixture();
        UUID meId = UUID.randomUUID(), candidateId = UUID.randomUUID();
        var me = p(meId, "Me", Gender.MAN, Set.of(Gender.WOMAN), BodyType.ATHLETIC, true);
        var candidate = p(candidateId, "Candidate", Gender.WOMAN, Set.of(Gender.MAN), BodyType.ATHLETIC, true);
        f.stub(meId, me, List.of(candidate), List.of());

        var explanation = f.service.explain(meId, candidateId);
        assertTrue(explanation.eligible());
        assertNotNull(explanation.score());
        assertTrue(explanation.features().containsKey("distance"));
        assertTrue(explanation.features().containsKey("interests"));
        assertTrue(explanation.weights().containsKey("activity"));
        assertTrue(explanation.coldStart());
    }

    @Test
    void cursorPageContinuesAfterLastCandidate() {
        Fixture f = new Fixture();
        UUID meId = UUID.randomUUID();
        var me = p(meId, "Me", Gender.MAN, Set.of(Gender.WOMAN), null, true);
        List<ProfileQuery.ProfileView> candidates = new ArrayList<>();
        for (int i = 0; i < 6; i++) candidates.add(p(UUID.randomUUID(), "Candidate " + i, Gender.WOMAN, Set.of(Gender.MAN), null, true));
        f.stub(meId, me, candidates, List.of());

        var first = f.service.discoverPage(meId, 3, null);
        assertEquals(3, first.items().size());
        assertNotNull(first.nextCursor());
        var second = f.service.discoverPage(meId, 3, first.nextCursor());
        assertFalse(second.items().isEmpty());
        assertTrue(Collections.disjoint(first.items().stream().map(x -> x.profile().userId()).toList(),
            second.items().stream().map(x -> x.profile().userId()).toList()));
    }

    private static ProfileQuery.ProfileView p(UUID id, String name, Gender gender, Set<Gender> lookingFor, BodyType bodyType, boolean discoverable) {
        return p(id, name, gender, lookingFor, bodyType, discoverable, 18, 99, 100, false, false, false, -26.9, -49.0);
    }

    private static ProfileQuery.ProfileView p(UUID id, String name, Gender gender, Set<Gender> lookingFor, BodyType bodyType,
            boolean discoverable, int minAge, int maxAge, int maxDistance, boolean strictAge, boolean strictDistance,
            boolean globalMode, Double lat, Double lon) {
        return new ProfileQuery.ProfileView(id, name, "Uma bio completa com interesses e contexto suficiente para o perfil.",
            LocalDate.ofInstant(NOW, ZoneOffset.UTC).minusYears(30), gender, bodyType, "Blumenau", "SC", "BR", lat, lon,
            minAge, maxAge, maxDistance, strictAge, strictDistance, discoverable, false, globalMode,
            Set.of("java", "trilhas", "viagens"), lookingFor, Set.of(),
            NOW.minus(Duration.ofDays(30)), NOW.minus(Duration.ofHours(2)), NOW.minus(Duration.ofHours(1)));
    }


    private static ProfileQuery.ProfileView withPreferredBodyTypes(ProfileQuery.ProfileView p, Set<BodyType> preferred) {
        return new ProfileQuery.ProfileView(p.userId(), p.displayName(), p.bio(), p.birthDate(), p.gender(), p.bodyType(),
            p.city(), p.state(), p.country(), p.latitude(), p.longitude(), p.minAge(), p.maxAge(), p.maxDistanceKm(),
            p.strictAge(), p.strictDistance(), p.discoverable(), p.recentlyActiveFirst(), p.globalMode(), p.interests(),
            p.lookingFor(), preferred, p.createdAt(), p.updatedAt(), p.lastActiveAt());
    }

    private static ProfileQuery.ProfileView withLookingFor(ProfileQuery.ProfileView p, Set<Gender> lookingFor) {
        return new ProfileQuery.ProfileView(p.userId(), p.displayName(), p.bio(), p.birthDate(), p.gender(), p.bodyType(),
            p.city(), p.state(), p.country(), p.latitude(), p.longitude(), p.minAge(), p.maxAge(), p.maxDistanceKm(),
            p.strictAge(), p.strictDistance(), p.discoverable(), p.recentlyActiveFirst(), p.globalMode(), p.interests(),
            lookingFor, p.preferredBodyTypes(), p.createdAt(), p.updatedAt(), p.lastActiveAt());
    }

    private static final class Fixture {
        final ProfileQuery profiles = mock(ProfileQuery.class);
        final InteractionQuery interactions = mock(InteractionQuery.class);
        final TrustSafetyQuery safety = mock(TrustSafetyQuery.class);
        final MatchQuery matches = mock(MatchQuery.class);
        final CandidateRetrievalService retrieval = mock(CandidateRetrievalService.class);
        final RecommendationProperties properties = new RecommendationProperties();
        final DiscoveryCooldownProperties cooldownProperties = new DiscoveryCooldownProperties();
        final CooldownPolicy cooldown = new CooldownPolicy(cooldownProperties);
        final EligibilityService eligibility = new EligibilityService(cooldown);
        final ImplicitPreferenceService implicit = new ImplicitPreferenceService(profiles, properties);
        final BehaviorSignalService behavior = mock(BehaviorSignalService.class);
        final FeatureBuilder features = new FeatureBuilder(implicit, properties);
        final RankingService ranking = new RankingService();
        final DiversificationService diversification = new DiversificationService(properties);
        final ExplorationService exploration = new ExplorationService(properties);
        final DiscoveryCursorCodec cursors = new DiscoveryCursorCodec();
        final DiscoveryMetrics metrics = new DiscoveryMetrics(new SimpleMeterRegistry());
        final RecommendationService service = new RecommendationService(profiles, interactions, safety, matches, retrieval,
            eligibility, features, ranking, diversification, exploration, implicit, behavior, cursors, properties, metrics, CLOCK);

        void stub(UUID me, ProfileQuery.ProfileView self, List<ProfileQuery.ProfileView> candidates,
                  List<InteractionQuery.InteractionView> history) {
            when(profiles.find(me)).thenReturn(Optional.of(self));
            for (var candidate : candidates) when(profiles.find(candidate.userId())).thenReturn(Optional.of(candidate));
            when(retrieval.retrieve(eq(self), anyInt())).thenReturn(candidates);
            when(interactions.recentBy(eq(me), anyInt())).thenReturn(history);
            Map<UUID, InteractionQuery.InteractionView> latest = new HashMap<>();
            for (InteractionQuery.InteractionView item : history) latest.putIfAbsent(item.targetId(), item);
            when(interactions.latestBy(eq(me), anyCollection())).thenReturn(Map.copyOf(latest));
            when(behavior.recent(eq(me), anyInt())).thenReturn(history.stream().map(i -> new BehaviorSignal(i.targetId(), BehaviorSignalType.valueOf(i.type()), i.createdAt())).toList());
            when(safety.excluded(me)).thenReturn(Set.of());
            when(matches.activeCounterparts(me)).thenReturn(Set.of());
            when(matches.unmatchedSince(eq(me), any())).thenReturn(Set.of());
            when(profiles.findMany(anyCollection())).thenAnswer(invocation -> {
                Collection<UUID> requested = invocation.getArgument(0);
                return candidates.stream().filter(p -> requested.contains(p.userId())).toList();
            });
        }
    }
}
