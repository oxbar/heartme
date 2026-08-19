package com.himeros.recommendation;

import com.himeros.profile.ProfileQuery;
import java.time.Period;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class DiversificationService {
    private final RecommendationProperties properties;

    public DiversificationService(RecommendationProperties properties) { this.properties = properties; }

    public List<RankingService.RankedCandidate> diversify(List<RankingService.RankedCandidate> ranked) {
        if (ranked.size() < 2) return ranked;
        List<RankingService.RankedCandidate> remaining = new ArrayList<>(ranked);
        List<RankingService.RankedCandidate> selected = new ArrayList<>(ranked.size());
        while (!remaining.isEmpty()) {
            RankingService.RankedCandidate best = null;
            double bestUtility = Double.NEGATIVE_INFINITY;
            for (RankingService.RankedCandidate candidate : remaining) {
                double similarity = selected.stream().mapToDouble(s -> similarity(candidate.profile(), s.profile())).max().orElse(0.0);
                double utility = candidate.score() - (properties.getDiversificationPenalty() * similarity);
                if (best == null || utility > bestUtility || (utility == bestUtility && compareId(candidate, best) < 0)) {
                    best = candidate; bestUtility = utility;
                }
            }
            selected.add(best);
            remaining.remove(best);
        }
        return List.copyOf(selected);
    }

    private static int compareId(RankingService.RankedCandidate a, RankingService.RankedCandidate b) {
        return a.profile().userId().toString().compareTo(b.profile().userId().toString());
    }

    private static double similarity(ProfileQuery.ProfileView a, ProfileQuery.ProfileView b) {
        double score = 0;
        if (a.bodyType() != null && a.bodyType() == b.bodyType()) score += 0.30;
        if (Objects.equals(normalize(a.city()), normalize(b.city()))) score += 0.20;
        int ageA = Period.between(a.birthDate(), java.time.LocalDate.now()).getYears();
        int ageB = Period.between(b.birthDate(), java.time.LocalDate.now()).getYears();
        if (Math.abs(ageA - ageB) <= 2) score += 0.20;
        Set<String> left = normalize(a.interests()), right = normalize(b.interests());
        if (!left.isEmpty() && !right.isEmpty()) {
            Set<String> inter = new HashSet<>(left); inter.retainAll(right);
            Set<String> union = new HashSet<>(left); union.addAll(right);
            score += 0.30 * ((double) inter.size() / union.size());
        }
        return Math.min(1, score);
    }

    private static String normalize(String s) { return s == null ? "" : s.trim().toLowerCase(Locale.ROOT); }
    private static Set<String> normalize(Set<String> values) {
        Set<String> result = new HashSet<>();
        if (values != null) values.stream().map(DiversificationService::normalize).filter(s -> !s.isBlank()).forEach(result::add);
        return result;
    }
}
