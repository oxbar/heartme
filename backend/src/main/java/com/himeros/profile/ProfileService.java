package com.himeros.profile;

import com.himeros.shared.outbox.*;
import com.himeros.identity.*;
import com.himeros.shared.UserActivityObserved;
import org.springframework.context.event.EventListener;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
public class ProfileService implements ProfileQuery {
    private final ProfileRepository repo;
    private final IdentityLookup identity;
    private final OutboxService outbox;

    public ProfileService(ProfileRepository repo, IdentityLookup identity, OutboxService outbox) {
        this.repo = repo;
        this.identity = identity;
        this.outbox = outbox;
    }

    public record UpsertCommand(String displayName, String bio, java.time.LocalDate birthDate, Gender gender,
            BodyType bodyType, String city, String state, String country, Double latitude, Double longitude, int minAge,
            int maxAge, int maxDistanceKm, boolean strictAge, boolean strictDistance, boolean discoverable,
            boolean recentlyActiveFirst, boolean globalMode, Set<String> interests, Set<Gender> lookingFor,
            Set<BodyType> preferredBodyTypes) {
    }

    @Transactional
    public ProfileView upsert(UUID userId, UpsertCommand c) {
        if (!identity.exists(userId)) throw new IllegalArgumentException("Unknown user " + userId);
        if (java.time.Period.between(c.birthDate(), java.time.LocalDate.now()).getYears() < 18)
            throw new IllegalArgumentException("Must be 18+");
        if (c.minAge() > c.maxAge()) throw new IllegalArgumentException("minAge cannot exceed maxAge");
        Profile p = repo.findById(userId).orElseGet(() -> new Profile(userId, c.displayName(), c.birthDate(), c.gender()));
        p.update(c.displayName(), c.bio(), c.birthDate(), c.gender(), c.bodyType(), c.city(), c.state(), c.country(),
                c.latitude(), c.longitude(), c.minAge(), c.maxAge(), c.maxDistanceKm(), c.strictAge(),
                c.strictDistance(), c.discoverable(), c.recentlyActiveFirst(), c.globalMode(), c.interests(),
                c.lookingFor(), c.preferredBodyTypes());
        repo.save(p);
        return view(p);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ProfileView> find(UUID id) { return repo.findById(id).map(ProfileService::view); }

    @Override
    @Transactional(readOnly = true)
    public List<ProfileView> findMany(Collection<UUID> ids) {
        if (ids == null || ids.isEmpty()) return List.of();
        return repo.findAllById(ids).stream().map(ProfileService::view).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProfileView> candidatePool(UUID excluding, int limit) {
        return repo.findByDiscoverableTrueAndUserIdNot(excluding, PageRequest.of(0, Math.min(limit, 2000))).stream()
                .map(ProfileService::view).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProfileView> candidatePool(UUID excluding, Double latitude, Double longitude, Integer radiusKm,
                                           boolean globalMode, int limit) {
        return repo.findDiscoveryCandidates(excluding, latitude, longitude, radiusKm, globalMode, Math.min(limit, 2000))
            .stream().map(ProfileService::view).toList();
    }

    @EventListener
    @Transactional
    public void on(UserActivityObserved event) {
        repo.touchActivity(event.userId(), event.at(), event.at().minusSeconds(300));
    }

    static ProfileView view(Profile p) {
        return new ProfileView(p.getUserId(), p.getDisplayName(), p.getBio(), p.getBirthDate(), p.getGender(),
                p.getBodyType(), p.getCity(), p.getState(), p.getCountry(), p.getLatitude(), p.getLongitude(),
                p.getMinAge(), p.getMaxAge(), p.getMaxDistanceKm(), p.isStrictAge(), p.isStrictDistance(),
                p.isDiscoverable(), p.isRecentlyActiveFirst(), p.isGlobalMode(), p.getInterests(), p.getLookingFor(),
                p.getPreferredBodyTypes(), p.getCreatedAt(), p.getUpdatedAt(), p.getLastActiveAt());
    }
}
