package com.himeros.recommendation;

import com.himeros.interaction.InteractionQuery;
import com.himeros.profile.*;
import com.himeros.shared.ResourceNotFoundException;
import com.himeros.trustsafety.TrustSafetyQuery;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class RecommendationService {
    private final ProfileQuery profiles;
    private final InteractionQuery interactions;
    private final TrustSafetyQuery safety;

    public RecommendationService(ProfileQuery profiles, InteractionQuery interactions, TrustSafetyQuery safety) {
        this.profiles = profiles;
        this.interactions = interactions;
        this.safety = safety;
    }

    public List<Recommendation> discover(UUID user, int limit) {
        ProfileQuery.ProfileView me = profiles.find(user)
            .orElseThrow(() -> new ResourceNotFoundException("Complete your profile first"));
        Set<UUID> seen = interactions.seenBy(user);
        Set<UUID> excluded = safety.excluded(user);

        return profiles.candidatePool(user, Math.max(100, limit * 10)).stream()
            .filter(p -> !seen.contains(p.userId()) && !excluded.contains(p.userId()))
            .filter(p -> eligible(me, p))
            .map(p -> new Recommendation(publicProfile(p), score(me, p), roundedDistance(me, p)))
            .sorted(Comparator.comparingDouble(Recommendation::score).reversed())
            .limit(Math.min(limit, 100))
            .toList();
    }

    /**
     * Discovery preferences belong to the viewer and define the viewer's feed.
     *
     * A candidate's own lookingFor/age/distance/body preferences must not be
     * re-applied in reverse here. Doing that makes discovery implicitly mutual
     * and can hide two otherwise valid accounts from one another when only one
     * side has changed a preference (or an older onboarding default was saved).
     *
     * Inbound visibility is controlled by discoverable plus trust/safety rules.
     */
    private boolean eligible(ProfileQuery.ProfileView me, ProfileQuery.ProfileView candidate) {
        if (!candidate.discoverable()) return false;

        int candidateAge = age(candidate.birthDate());
        if (me.strictAge() && (candidateAge < me.minAge() || candidateAge > me.maxAge())) return false;

        if (!me.lookingFor().isEmpty() && !me.lookingFor().contains(candidate.gender())) return false;

        if (!me.preferredBodyTypes().isEmpty()
            && candidate.bodyType() != null
            && !me.preferredBodyTypes().contains(candidate.bodyType())) {
            return false;
        }

        Double distance = distance(me, candidate);
        if (!me.globalMode()
            && me.strictDistance()
            && distance != null
            && distance > me.maxDistanceKm()) {
            return false;
        }

        return true;
    }

    private static int age(LocalDate birthDate) {
        return Period.between(birthDate, LocalDate.now()).getYears();
    }

    private double score(ProfileQuery.ProfileView a, ProfileQuery.ProfileView b) {
        double score = 50;
        Set<String> overlap = new HashSet<>(a.interests());
        overlap.retainAll(b.interests());
        score += Math.min(25, overlap.size() * 5);
        Double distance = distance(a, b);
        if (distance != null) {
            score += Math.max(0, 25 - (distance / Math.max(1, a.maxDistanceKm())) * 25);
        }
        return Math.round(score * 100.0) / 100.0;
    }

    private Double roundedDistance(ProfileQuery.ProfileView a, ProfileQuery.ProfileView b) {
        Double d = distance(a, b);
        return d == null ? null : Math.round(d * 10.0) / 10.0;
    }

    private Double distance(ProfileQuery.ProfileView a, ProfileQuery.ProfileView b) {
        if (a.latitude() == null || a.longitude() == null || b.latitude() == null || b.longitude() == null) return null;
        double radiusKm = 6371;
        double dLat = Math.toRadians(b.latitude() - a.latitude());
        double dLon = Math.toRadians(b.longitude() - a.longitude());
        double h = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(a.latitude())) * Math.cos(Math.toRadians(b.latitude()))
            * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return radiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    }

    private static PublicCandidate publicProfile(ProfileQuery.ProfileView p) {
        return new PublicCandidate(
            p.userId(),
            p.displayName(),
            p.bio(),
            age(p.birthDate()),
            p.gender(),
            p.city(),
            p.state(),
            p.country(),
            p.interests()
        );
    }

    public record PublicCandidate(
        UUID userId,
        String displayName,
        String bio,
        int age,
        Gender gender,
        String city,
        String state,
        String country,
        Set<String> interests
    ) {}

    public record Recommendation(PublicCandidate profile, double score, Double distanceKm) {}
}
