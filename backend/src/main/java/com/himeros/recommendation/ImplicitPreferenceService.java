package com.himeros.recommendation;

import com.himeros.profile.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class ImplicitPreferenceService {
    private final ProfileQuery profiles;
    private final RecommendationProperties properties;

    public ImplicitPreferenceService(ProfileQuery profiles, RecommendationProperties properties) {
        this.profiles = profiles; this.properties = properties;
    }

    public ImplicitPreferenceModel build(List<BehaviorSignal> history) {
        if (history.isEmpty()) return ImplicitPreferenceModel.empty();
        List<UUID> targets = history.stream().map(BehaviorSignal::targetId).distinct().toList();
        Map<UUID, ProfileQuery.ProfileView> targetProfiles = new HashMap<>();
        profiles.findMany(targets).forEach(p -> targetProfiles.put(p.userId(), p));

        Map<BodyType, Double> body = new EnumMap<>(BodyType.class);
        Map<String, Double> interests = new HashMap<>();
        double signalMass = 0;
        int signals = 0;

        for (BehaviorSignal signal : history) {
            ProfileQuery.ProfileView target = targetProfiles.get(signal.targetId());
            if (target == null) continue;
            double weight = signalWeight(signal.type());
            if (weight == 0) continue;
            signals++;
            signalMass += Math.abs(weight);
            if (target.bodyType() != null) body.merge(target.bodyType(), weight, Double::sum);
            for (String interest : target.interests()) {
                String normalized = normalize(interest);
                if (!normalized.isBlank()) interests.merge(normalized, weight, Double::sum);
            }
        }
        return new ImplicitPreferenceModel(Map.copyOf(body), Map.copyOf(interests), signalMass, signals,
            signals < properties.getColdStartInteractions());
    }

    public double score(ImplicitPreferenceModel model, ProfileQuery.ProfileView candidate) {
        if (model.signalMass() <= 0) return 0.5;
        double bodyScore = 0.5;
        if (candidate.bodyType() != null)
            bodyScore = normalizeSignal(model.bodyTypeWeights().getOrDefault(candidate.bodyType(), 0.0), model.signalMass());

        double interestSignal = candidate.interests().stream().map(ImplicitPreferenceService::normalize)
            .mapToDouble(i -> model.interestWeights().getOrDefault(i, 0.0)).average().orElse(0.0);
        double interestScore = normalizeSignal(interestSignal, model.signalMass());
        return clamp((bodyScore * 0.55) + (interestScore * 0.45));
    }

    /** Centralized behavior weights: deterministic, explainable and easy to tune. */
    static double signalWeight(BehaviorSignalType type) {
        return switch (type) {
            case VIEW -> 0.05;
            case LIKE -> 1.00;
            case SUPER_LIKE -> 2.00;
            case MATCH -> 3.00;
            case MESSAGE -> 4.00;
            case CONVERSATION -> 6.00;
            case PASS -> -0.50;
            case UNMATCH -> -3.00;
            case BLOCK -> -8.00;
            case REPORT -> -10.00;
        };
    }

    private static double normalizeSignal(double value, double mass) {
        double scaled = value / Math.max(1.0, mass * 0.20);
        return clamp(0.5 + (0.5 * Math.tanh(scaled)));
    }
    private static String normalize(String value) { return value == null ? "" : value.trim().toLowerCase(Locale.ROOT); }
    private static double clamp(double value) { return Math.max(0, Math.min(1, value)); }

    public record ImplicitPreferenceModel(Map<BodyType, Double> bodyTypeWeights, Map<String, Double> interestWeights,
                                          double signalMass, int signalCount, boolean coldStart) {
        static ImplicitPreferenceModel empty() { return new ImplicitPreferenceModel(Map.of(), Map.of(), 0, 0, true); }
    }
}
