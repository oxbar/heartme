package com.himeros.recommendation;

import com.himeros.profile.ProfileQuery;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class EligibilityService {
    private final CooldownPolicy cooldownPolicy;

    public EligibilityService(CooldownPolicy cooldownPolicy) {
        this.cooldownPolicy = cooldownPolicy;
    }

    public EligibilityResult evaluate(ProfileQuery.ProfileView me, ProfileQuery.ProfileView candidate, RecommendationContext context) {
        if (candidate.userId().equals(me.userId())) return EligibilityResult.no("SELF");
        if (!candidate.discoverable()) return EligibilityResult.no("NOT_DISCOVERABLE");
        if (context.safetyExcluded().contains(candidate.userId())) return EligibilityResult.no("BLOCKED_OR_REPORTED");
        if (context.activeMatches().contains(candidate.userId())) return EligibilityResult.no("ACTIVE_MATCH");
        if (context.recentlyUnmatched().contains(candidate.userId())) return EligibilityResult.no("UNMATCH_COOLDOWN");

        if (!me.lookingFor().isEmpty() && !me.lookingFor().contains(candidate.gender())) {
            return EligibilityResult.no("GENDER_FILTER");
        }

        int age = Period.between(candidate.birthDate(), context.today()).getYears();
        if (me.strictAge() && (age < me.minAge() || age > me.maxAge())) {
            return EligibilityResult.no("STRICT_AGE");
        }

        Double distance = DistanceCalculator.km(me, candidate);
        if (!me.globalMode() && me.strictDistance()) {
            if (distance == null) return EligibilityResult.no("DISTANCE_UNKNOWN");
            if (distance > me.maxDistanceKm()) return EligibilityResult.no("STRICT_DISTANCE");
        }

        var interaction = context.lastInteractionByTarget().get(candidate.userId());
        if (interaction != null && cooldownPolicy.suppressed(interaction, context.now())) {
            return new EligibilityResult(false, "INTERACTION_COOLDOWN", cooldownPolicy.cooldownUntil(interaction).orElse(null));
        }

        return EligibilityResult.yes();
    }

    public record EligibilityResult(boolean eligible, String reason, Instant cooldownUntil) {
        static EligibilityResult yes() { return new EligibilityResult(true, "ELIGIBLE", null); }
        static EligibilityResult no(String reason) { return new EligibilityResult(false, reason, null); }
    }
}
