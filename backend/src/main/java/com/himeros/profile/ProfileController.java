package com.himeros.profile;

import com.himeros.shared.*;
import com.himeros.trustsafety.TrustSafetyQuery;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.Period;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/profile")
public class ProfileController {
    private final ProfileService service;
    private final CurrentUser current;
    private final TrustSafetyQuery safety;

    public ProfileController(ProfileService service, CurrentUser current, TrustSafetyQuery safety) {
        this.service = service;
        this.current = current;
        this.safety = safety;
    }

    /** Owner-only profile including exact coordinates and discovery preferences. */
    @GetMapping
    public ProfileQuery.ProfileView me() {
        return service.find(current.id())
                .orElseThrow(() -> new ResourceNotFoundException("Profile not found"));
    }

    /**
     * Public-safe projection: no exact coordinates, birth date or private discovery
     * filters.
     */
    @GetMapping("/{userId}")
    public PublicProfileView get(@PathVariable UUID userId) {
        if (safety.blockedEitherWay(current.id(), userId)) {
            throw new ResourceNotFoundException("Profile not found");
        }
        return service.find(userId)
                .map(ProfileController::publicView)
                .orElseThrow(() -> new ResourceNotFoundException("Profile not found"));
    }

    @PostMapping("/presence")
    public PresenceView pingPresence() {
        return presenceView(service.touchPresence(current.id()));
    }

    @GetMapping("/{userId}/presence")
    public PresenceView presence(@PathVariable UUID userId) {
        if (safety.blockedEitherWay(current.id(), userId)) {
            throw new ResourceNotFoundException("Profile not found");
        }
        return service.find(userId).map(ProfileController::presenceView)
                .orElseThrow(() -> new ResourceNotFoundException("Profile not found"));
    }

    @PutMapping
    public ProfileQuery.ProfileView upsert(@Valid @RequestBody Request r) {
        return service.upsert(current.id(), new ProfileService.UpsertCommand(
                r.displayName(), r.bio(), r.birthDate(), r.gender(), r.bodyType(),
                r.city(), r.state(), r.country(), r.latitude(), r.longitude(),
                r.minAge(), r.maxAge(), r.maxDistanceKm(),
                r.strictAge(), r.strictDistance(), r.discoverable(),
                r.recentlyActiveFirst(), r.globalMode(),
                r.interests(), r.lookingFor(), r.preferredBodyTypes()));
    }

    private static PresenceView presenceView(ProfileQuery.ProfileView p) {
        java.time.Instant lastSeen = p.lastActiveAt();
        boolean online = lastSeen != null && lastSeen.isAfter(java.time.Instant.now().minusSeconds(90));
        return new PresenceView(p.userId(), online, lastSeen);
    }

    private static PublicProfileView publicView(ProfileQuery.ProfileView p) {
        int age = Period.between(p.birthDate(), LocalDate.now()).getYears();
        return new PublicProfileView(
                p.userId(), p.displayName(), p.bio(), age, p.gender(), p.bodyType(),
                p.city(), p.state(), p.country(), p.interests());
    }

    public record PresenceView(UUID userId, boolean online, java.time.Instant lastSeenAt) {}

    public record PublicProfileView(
            UUID userId,
            String displayName,
            String bio,
            int age,
            Gender gender,
            BodyType bodyType,
            String city,
            String state,
            String country,
            Set<String> interests) {
    }

    public record Request(
            @NotBlank @Size(max = 80) String displayName,
            @Size(max = 1000) String bio,
            @NotNull @Past LocalDate birthDate,
            @NotNull Gender gender,
            BodyType bodyType,
            @Size(max = 120) String city,
            @Size(max = 120) String state,
            @Size(max = 120) String country,
            @DecimalMin("-90") @DecimalMax("90") Double latitude,
            @DecimalMin("-180") @DecimalMax("180") Double longitude,
            @Min(18) @Max(99) int minAge,
            @Min(18) @Max(99) int maxAge,
            @Min(1) @Max(500) int maxDistanceKm,
            boolean strictAge,
            boolean strictDistance,
            boolean discoverable,
            boolean recentlyActiveFirst,
            boolean globalMode,
            @Size(max = 30) Set<@Size(max = 80) String> interests,
            @NotEmpty Set<Gender> lookingFor,
            Set<BodyType> preferredBodyTypes) {
        public Request {
            if (minAge > maxAge)
                throw new IllegalArgumentException("minAge cannot exceed maxAge");
        }
    }
}
