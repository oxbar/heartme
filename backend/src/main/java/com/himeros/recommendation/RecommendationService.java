package com.himeros.recommendation;

import com.himeros.interaction.InteractionQuery;
import com.himeros.match.MatchQuery;
import com.himeros.profile.*;
import com.himeros.shared.ResourceNotFoundException;
import com.himeros.trustsafety.TrustSafetyQuery;
import io.micrometer.core.instrument.Timer;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class RecommendationService {
    private final ProfileQuery profiles;
    private final InteractionQuery interactions;
    private final TrustSafetyQuery safety;
    private final MatchQuery matches;
    private final CandidateRetrievalService retrieval;
    private final EligibilityService eligibility;
    private final FeatureBuilder features;
    private final RankingService ranking;
    private final DiversificationService diversification;
    private final ExplorationService exploration;
    private final ImplicitPreferenceService implicitPreferences;
    private final BehaviorSignalService behaviorSignals;
    private final DiscoveryCursorCodec cursors;
    private final RecommendationProperties properties;
    private final DiscoveryMetrics metrics;
    private final Clock clock;

    @Autowired
    public RecommendationService(ProfileQuery profiles, InteractionQuery interactions, TrustSafetyQuery safety,
            MatchQuery matches, CandidateRetrievalService retrieval, EligibilityService eligibility,
            FeatureBuilder features, RankingService ranking, DiversificationService diversification,
            ExplorationService exploration, ImplicitPreferenceService implicitPreferences, BehaviorSignalService behaviorSignals,
            DiscoveryCursorCodec cursors, RecommendationProperties properties, DiscoveryMetrics metrics) {
        this(profiles, interactions, safety, matches, retrieval, eligibility, features, ranking, diversification,
            exploration, implicitPreferences, behaviorSignals, cursors, properties, metrics, Clock.systemUTC());
    }

    RecommendationService(ProfileQuery profiles, InteractionQuery interactions, TrustSafetyQuery safety,
            MatchQuery matches, CandidateRetrievalService retrieval, EligibilityService eligibility,
            FeatureBuilder features, RankingService ranking, DiversificationService diversification,
            ExplorationService exploration, ImplicitPreferenceService implicitPreferences, BehaviorSignalService behaviorSignals,
            DiscoveryCursorCodec cursors, RecommendationProperties properties, DiscoveryMetrics metrics, Clock clock) {
        this.profiles = profiles; this.interactions = interactions; this.safety = safety; this.matches = matches;
        this.retrieval = retrieval; this.eligibility = eligibility; this.features = features; this.ranking = ranking;
        this.diversification = diversification; this.exploration = exploration; this.implicitPreferences = implicitPreferences;
        this.behaviorSignals = behaviorSignals; this.cursors = cursors; this.properties = properties; this.metrics = metrics; this.clock = clock;
    }

    /** Backwards-compatible list endpoint. */
    public List<Recommendation> discover(UUID user, int limit) {
        return discoverPage(user, limit, null).items();
    }

    public RecommendationPage discoverPage(UUID user, int limit, String cursor) {
        Timer.Sample timer = metrics.start();
        try {
            Instant now = clock.instant();
            ProfileQuery.ProfileView me = viewer(user);
            List<ProfileQuery.ProfileView> pool = retrieval.retrieve(me, Math.min(limit, 100));
            RecommendationContext context = context(user, me, now, pool.stream().map(ProfileQuery.ProfileView::userId).toList());
            metrics.pool(pool.size());

            List<RankingService.RankedCandidate> ranked = new ArrayList<>();
            for (ProfileQuery.ProfileView candidate : pool) {
                EligibilityService.EligibilityResult result = eligibility.evaluate(context.me(), candidate, context);
                if (!result.eligible()) {
                    metrics.excluded(result.reason());
                    continue;
                }
                FeatureBuilder.RankingFeatures built = features.build(context.me(), candidate, context);
                ranked.add(ranking.rank(context.me(), candidate, built, context));
            }
            ranked.sort(Comparator.comparingDouble(RankingService.RankedCandidate::score).reversed()
                .thenComparing(c -> c.profile().userId().toString()));
            List<RankingService.RankedCandidate> ordered = exploration.rebalance(diversification.diversify(ranked));

            int start = cursorStart(ordered, cursor);
            int end = Math.min(ordered.size(), start + Math.min(limit, 100));
            List<Recommendation> items = ordered.subList(start, end).stream().map(RecommendationService::recommendation).toList();
            String nextCursor = end < ordered.size() && !items.isEmpty()
                ? cursors.encode(items.getLast().profile().userId()) : null;
            metrics.results(items.size());
            return new RecommendationPage(items, nextCursor, pool.size(), ranked.size());
        } finally {
            metrics.stop(timer);
        }
    }

    public Explanation explain(UUID user, UUID candidateId) {
        Instant now = clock.instant();
        ProfileQuery.ProfileView me = viewer(user);
        ProfileQuery.ProfileView candidate = profiles.find(candidateId)
            .orElseThrow(() -> new ResourceNotFoundException("Candidate profile not found"));
        RecommendationContext context = context(user, me, now, List.of(candidateId));
        EligibilityService.EligibilityResult result = eligibility.evaluate(context.me(), candidate, context);
        Double distanceKm = DistanceCalculator.km(context.me(), candidate);
        if (!result.eligible()) {
            return new Explanation(candidateId, false, result.reason(), null, rounded(distanceKm), Map.of(), Map.of(),
                Set.of(), result.cooldownUntil(), context.implicitPreferences().coldStart());
        }
        FeatureBuilder.RankingFeatures built = features.build(context.me(), candidate, context);
        RankingService.RankedCandidate ranked = ranking.rank(context.me(), candidate, built, context);
        return new Explanation(candidateId, true, "ELIGIBLE", score100(ranked.score()), rounded(built.distanceKm()),
            featureMap(built), ranked.weights().asMap(), built.commonInterests(), null,
            context.implicitPreferences().coldStart());
    }

    private ProfileQuery.ProfileView viewer(UUID user) {
        return profiles.find(user).orElseThrow(() -> new ResourceNotFoundException("Complete your profile first"));
    }

    private RecommendationContext context(UUID user, ProfileQuery.ProfileView me, Instant now, Collection<UUID> candidateIds) {
        Map<UUID, InteractionQuery.InteractionView> latest = interactions.latestBy(user, candidateIds);
        var implicitModel = implicitPreferences.build(behaviorSignals.recent(user, properties.getImplicitHistoryLimit()));
        return new RecommendationContext(
            me, now, LocalDate.ofInstant(now, ZoneOffset.UTC), latest,
            safety.excluded(user), matches.activeCounterparts(user),
            matches.unmatchedSince(user, now.minus(properties.getUnmatchCooldown())), implicitModel);
    }

    private int cursorStart(List<RankingService.RankedCandidate> ordered, String cursor) {
        Optional<UUID> last = cursors.decode(cursor);
        if (last.isEmpty()) return 0;
        for (int i = 0; i < ordered.size(); i++) if (ordered.get(i).profile().userId().equals(last.get())) return i + 1;
        return 0;
    }

    private static Recommendation recommendation(RankingService.RankedCandidate candidate) {
        return new Recommendation(publicProfile(candidate.profile()), score100(candidate.score()), rounded(candidate.features().distanceKm()));
    }

    private static Map<String, Double> featureMap(FeatureBuilder.RankingFeatures f) {
        Map<String, Double> map = new LinkedHashMap<>();
        map.put("preference", f.preference()); map.put("distance", f.distance()); map.put("activity", f.activity());
        map.put("interests", f.interests()); map.put("profileQuality", f.profileQuality()); map.put("novelty", f.novelty());
        map.put("implicitPreference", f.implicitPreference()); map.put("exploration", f.exploration());
        return map;
    }

    private static double score100(double score) { return Math.round(score * 10_000.0) / 100.0; }
    private static Double rounded(Double value) { return value == null ? null : Math.round(value * 10.0) / 10.0; }

    private static PublicCandidate publicProfile(ProfileQuery.ProfileView p) {
        return new PublicCandidate(p.userId(), p.displayName(), p.bio(),
            Period.between(p.birthDate(), LocalDate.now()).getYears(), p.gender(), p.bodyType(),
            p.city(), p.state(), p.country(), p.interests());
    }

    public record PublicCandidate(UUID userId, String displayName, String bio, int age, Gender gender, BodyType bodyType,
                                  String city, String state, String country, Set<String> interests) {}
    public record Recommendation(PublicCandidate profile, double score, Double distanceKm) {}
    public record RecommendationPage(List<Recommendation> items, String nextCursor, int poolSize, int eligibleCount) {}
    public record Explanation(UUID candidateId, boolean eligible, String excludedBy, Double score, Double distanceKm,
                              Map<String, Double> features, Map<String, Double> weights, Set<String> commonInterests,
                              Instant cooldownUntil, boolean coldStart) {}
}
