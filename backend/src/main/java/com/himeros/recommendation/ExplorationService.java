package com.himeros.recommendation;

import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class ExplorationService {
    private final RecommendationProperties properties;

    public ExplorationService(RecommendationProperties properties) { this.properties = properties; }

    public List<RankingService.RankedCandidate> rebalance(List<RankingService.RankedCandidate> input) {
        if (input.size() < 5) return input;
        List<RankingService.RankedCandidate> result = new ArrayList<>(input);
        int newEvery = properties.getNewProfileShare() <= 0 ? Integer.MAX_VALUE : Math.max(2, (int) Math.round(1 / properties.getNewProfileShare()));
        int exploreEvery = properties.getExplorationShare() <= 0 ? Integer.MAX_VALUE : Math.max(3, (int) Math.round(1 / properties.getExplorationShare()));

        for (int pos = newEvery - 1; pos < result.size(); pos += newEvery) {
            int found = findAfter(result, pos, c -> c.features().newProfile());
            if (found > pos) move(result, found, pos);
        }
        for (int pos = exploreEvery - 1; pos < result.size(); pos += exploreEvery) {
            int found = findBestExplorationAfter(result, pos);
            if (found > pos) move(result, found, pos);
        }
        return List.copyOf(result);
    }

    private static int findAfter(List<RankingService.RankedCandidate> list, int position,
                                 java.util.function.Predicate<RankingService.RankedCandidate> predicate) {
        for (int i = position + 1; i < Math.min(list.size(), position + 30); i++) if (predicate.test(list.get(i))) return i;
        return -1;
    }

    private static int findBestExplorationAfter(List<RankingService.RankedCandidate> list, int position) {
        int best = -1; double bestValue = -1;
        for (int i = position + 1; i < Math.min(list.size(), position + 30); i++) {
            double value = list.get(i).features().exploration();
            if (value > bestValue) { best = i; bestValue = value; }
        }
        return best;
    }

    private static void move(List<RankingService.RankedCandidate> list, int from, int to) {
        RankingService.RankedCandidate candidate = list.remove(from);
        list.add(to, candidate);
    }
}
