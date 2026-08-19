package com.himeros.recommendation;

import com.himeros.profile.ProfileQuery;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class RankingService {
    public RankedCandidate rank(ProfileQuery.ProfileView me, ProfileQuery.ProfileView candidate,
                                FeatureBuilder.RankingFeatures features, RecommendationContext context) {
        Weights weights = weightsFor(me, context.implicitPreferences().coldStart());
        double score =
            features.preference() * weights.preference() +
            features.distance() * weights.distance() +
            features.activity() * weights.activity() +
            features.interests() * weights.interests() +
            features.profileQuality() * weights.profileQuality() +
            features.novelty() * weights.novelty() +
            features.implicitPreference() * weights.implicitPreference() +
            features.exploration() * weights.exploration();
        return new RankedCandidate(candidate, round(clamp(score)), features, weights);
    }

    private static Weights weightsFor(ProfileQuery.ProfileView me, boolean coldStart) {
        if (coldStart) {
            return me.recentlyActiveFirst()
                ? new Weights(0.30, 0.20, 0.20, 0.10, 0.10, 0.05, 0.00, 0.05)
                : new Weights(0.35, 0.20, 0.15, 0.10, 0.10, 0.05, 0.00, 0.05);
        }
        return me.recentlyActiveFirst()
            ? new Weights(0.24, 0.16, 0.20, 0.11, 0.09, 0.07, 0.08, 0.05)
            : new Weights(0.30, 0.18, 0.12, 0.12, 0.10, 0.08, 0.05, 0.05);
    }

    private static double clamp(double value) { return Math.max(0, Math.min(1, value)); }
    private static double round(double value) { return Math.round(value * 10_000.0) / 10_000.0; }

    public record Weights(double preference, double distance, double activity, double interests,
                          double profileQuality, double novelty, double implicitPreference, double exploration) {
        public Map<String, Double> asMap() {
            Map<String, Double> map = new LinkedHashMap<>();
            map.put("preference", preference); map.put("distance", distance); map.put("activity", activity);
            map.put("interests", interests); map.put("profileQuality", profileQuality); map.put("novelty", novelty);
            map.put("implicitPreference", implicitPreference); map.put("exploration", exploration);
            return map;
        }
    }

    public record RankedCandidate(ProfileQuery.ProfileView profile, double score,
                                  FeatureBuilder.RankingFeatures features, Weights weights) {}
}
