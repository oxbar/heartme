package com.himeros.recommendation;

import com.himeros.interaction.InteractionQuery;
import com.himeros.profile.ProfileQuery;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class FeatureBuilder {
    private final ImplicitPreferenceService implicitPreferences;
    private final RecommendationProperties properties;

    public FeatureBuilder(ImplicitPreferenceService implicitPreferences, RecommendationProperties properties) {
        this.implicitPreferences = implicitPreferences;
        this.properties = properties;
    }

    public RankingFeatures build(ProfileQuery.ProfileView me, ProfileQuery.ProfileView candidate, RecommendationContext context) {
        Double distance = DistanceCalculator.km(me, candidate);
        double preference = preferenceScore(me, candidate, context.today());
        double distanceScore = distanceScore(me, distance);
        double activity = activityScore(candidate.lastActiveAt(), context.now());
        Set<String> common = commonInterests(me.interests(), candidate.interests());
        double interests = jaccard(me.interests(), candidate.interests());
        double quality = profileQuality(candidate);
        double novelty = noveltyScore(candidate, context.lastInteractionByTarget().get(candidate.userId()), context.now(), properties.getNewProfileDays());
        double implicit = implicitPreferences.score(context.implicitPreferences(), candidate);
        double exploration = deterministicExploration(me.userId(), candidate.userId(), context.today());
        return new RankingFeatures(preference, distanceScore, activity, interests, quality, novelty, implicit, exploration,
            distance, common, isNew(candidate, context.now(), properties.getNewProfileDays()));
    }

    private static double preferenceScore(ProfileQuery.ProfileView me, ProfileQuery.ProfileView candidate, LocalDate today) {
        int age = Period.between(candidate.birthDate(), today).getYears();
        double ageScore;
        if (age >= me.minAge() && age <= me.maxAge()) ageScore = 1.0;
        else {
            int outside = age < me.minAge() ? me.minAge() - age : age - me.maxAge();
            ageScore = Math.exp(-outside / 8.0);
        }

        double bodyScore;
        if (me.preferredBodyTypes().isEmpty()) bodyScore = 0.80;
        else if (candidate.bodyType() == null) bodyScore = 0.55;
        else bodyScore = me.preferredBodyTypes().contains(candidate.bodyType()) ? 1.0 : 0.25;
        return clamp(ageScore * 0.65 + bodyScore * 0.35);
    }

    private static double distanceScore(ProfileQuery.ProfileView me, Double distanceKm) {
        if (distanceKm == null) return 0.50;
        if (me.globalMode()) return Math.max(0.35, Math.exp(-distanceKm / 500.0));
        double tau = Math.max(15.0, me.maxDistanceKm() * 0.75);
        return clamp(Math.exp(-distanceKm / tau));
    }

    private static double activityScore(Instant lastActiveAt, Instant now) {
        if (lastActiveAt == null) return 0.10;
        long hours = Math.max(0, Duration.between(lastActiveAt, now).toHours());
        if (hours <= 1) return 1.0;
        if (hours <= 6) return 0.90;
        if (hours <= 24) return 0.75;
        if (hours <= 72) return 0.50;
        if (hours <= 168) return 0.25;
        return 0.10;
    }

    private static double profileQuality(ProfileQuery.ProfileView p) {
        double score = 0.20; // mandatory identity fields
        if (p.bio() != null && p.bio().trim().length() >= 40) score += 0.20;
        if (p.city() != null && !p.city().isBlank() && p.state() != null && !p.state().isBlank()) score += 0.15;
        if (p.country() != null && !p.country().isBlank()) score += 0.05;
        if (p.bodyType() != null) score += 0.10;
        if (p.interests() != null && p.interests().size() >= 3) score += 0.20;
        if (p.latitude() != null && p.longitude() != null) score += 0.10;
        return clamp(score);
    }

    private static double noveltyScore(ProfileQuery.ProfileView candidate, InteractionQuery.InteractionView previous, Instant now, int newProfileDays) {
        double createdBoost = isNew(candidate, now, newProfileDays) ? 1.0 : 0.75;
        // A VIEW is generated for analytics and must not penalize the candidate's novelty.
        // Only an explicit decision (PASS/LIKE/SUPER_LIKE) may affect rediscovery ranking.
        if (previous == null || "VIEW".equalsIgnoreCase(previous.type())) return createdBoost;
        long days = Math.max(0, Duration.between(previous.createdAt(), now).toDays());
        return clamp(Math.max(0.15, days / 60.0));
    }

    private static boolean isNew(ProfileQuery.ProfileView candidate, Instant now, int newProfileDays) {
        return candidate.createdAt() != null && candidate.createdAt().isAfter(now.minus(Duration.ofDays(Math.max(1, newProfileDays))));
    }

    private static Set<String> commonInterests(Set<String> a, Set<String> b) {
        Map<String, String> original = new HashMap<>();
        for (String value : a) original.put(normalize(value), value);
        Set<String> common = new LinkedHashSet<>();
        for (String value : b) {
            String key = normalize(value);
            if (original.containsKey(key)) common.add(original.get(key));
        }
        return Set.copyOf(common);
    }

    private static double jaccard(Set<String> a, Set<String> b) {
        Set<String> left = normalized(a), right = normalized(b);
        if (left.isEmpty() && right.isEmpty()) return 0.0;
        Set<String> intersection = new HashSet<>(left);
        intersection.retainAll(right);
        Set<String> union = new HashSet<>(left);
        union.addAll(right);
        return union.isEmpty() ? 0.0 : (double) intersection.size() / union.size();
    }

    private static Set<String> normalized(Set<String> values) {
        if (values == null) return Set.of();
        Set<String> result = new HashSet<>();
        values.stream().map(FeatureBuilder::normalize).filter(s -> !s.isBlank()).forEach(result::add);
        return result;
    }

    private static String normalize(String value) { return value == null ? "" : value.trim().toLowerCase(Locale.ROOT); }

    private static double deterministicExploration(UUID viewer, UUID candidate, LocalDate day) {
        long mixed = viewer.getMostSignificantBits() ^ candidate.getLeastSignificantBits() ^ day.toEpochDay();
        mixed ^= (mixed >>> 33); mixed *= 0xff51afd7ed558ccdl; mixed ^= (mixed >>> 33);
        return ((mixed & Long.MAX_VALUE) % 10_000) / 9_999.0;
    }

    private static double clamp(double value) { return Math.max(0, Math.min(1, value)); }

    public record RankingFeatures(
        double preference,
        double distance,
        double activity,
        double interests,
        double profileQuality,
        double novelty,
        double implicitPreference,
        double exploration,
        Double distanceKm,
        Set<String> commonInterests,
        boolean newProfile
    ) {}
}
