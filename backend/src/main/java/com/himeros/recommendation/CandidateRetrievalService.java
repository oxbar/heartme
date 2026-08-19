package com.himeros.recommendation;

import com.himeros.profile.ProfileQuery;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class CandidateRetrievalService {
    private final ProfileQuery profiles;
    private final CandidatePoolCache cache;
    private final RecommendationProperties properties;

    public CandidateRetrievalService(ProfileQuery profiles, CandidatePoolCache cache, RecommendationProperties properties) {
        this.profiles = profiles;
        this.cache = cache;
        this.properties = properties;
    }

    public List<ProfileQuery.ProfileView> retrieve(ProfileQuery.ProfileView me, int requestedLimit) {
        int poolLimit = Math.min(properties.getPoolSize(), Math.max(100, requestedLimit * properties.getPoolMultiplier()));
        Integer radius = retrievalRadius(me);
        String key = cacheKey(me, radius, poolLimit);

        Optional<List<UUID>> cached = cache.get(key);
        if (cached.isPresent()) {
            Map<UUID, ProfileQuery.ProfileView> byId = new HashMap<>();
            profiles.findMany(cached.get()).forEach(p -> byId.put(p.userId(), p));
            List<ProfileQuery.ProfileView> ordered = cached.get().stream().map(byId::get).filter(Objects::nonNull).toList();
            if (!ordered.isEmpty()) return ordered;
        }

        List<ProfileQuery.ProfileView> result = profiles.candidatePool(
            me.userId(), me.latitude(), me.longitude(), radius, me.globalMode(), poolLimit);

        // Non-strict distance is a preference, not a hard wall. In sparse markets, expand the
        // retrieval radius before ranking so the feed can degrade gracefully instead of going empty.
        int sparseThreshold = Math.min(poolLimit, Math.max(50, requestedLimit * 5));
        if (!me.globalMode() && !me.strictDistance() && result.size() < sparseThreshold
                && !Objects.equals(radius, properties.getMaxRetrievalRadiusKm())) {
            result = profiles.candidatePool(me.userId(), me.latitude(), me.longitude(),
                properties.getMaxRetrievalRadiusKm(), false, poolLimit);
        }

        cache.put(key, result.stream().map(ProfileQuery.ProfileView::userId).toList(), properties.getCacheTtl());
        return result;
    }

    private Integer retrievalRadius(ProfileQuery.ProfileView me) {
        if (me.globalMode()) return null;
        if (me.strictDistance()) return me.maxDistanceKm();
        int relaxed = Math.max(properties.getNonStrictRadiusKm(), me.maxDistanceKm() * 3);
        return Math.min(relaxed, properties.getMaxRetrievalRadiusKm());
    }

    private static String cacheKey(ProfileQuery.ProfileView me, Integer radius, int poolLimit) {
        long version = me.updatedAt() == null ? 0 : me.updatedAt().getEpochSecond();
        return me.userId() + ":" + version + ":" + (radius == null ? "global" : radius) + ":" + poolLimit;
    }
}
