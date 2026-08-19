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

    /** Public-safe projection: no exact coordinates, birth date or private discovery filters. */
    @GetMapping("/{userId}")
    public PublicProfileView get(@PathVariable UUID userId) {
        if (safety.blockedEitherWay(current.id(), userId)) {
            throw new ResourceNotFoundException("Profile not found");
        }
        return service.find(userId)
            .map(ProfileController::publicView)
            .orElseThrow(() -> new ResourceNotFoundException("Profile not found"));
    }

    @PutMapping
    public ProfileQuery.ProfileView upsert(@Valid @RequestBody Request r) {
        return service.upsert(current.id(), new ProfileService.UpsertCommand(
            r.displayName(), r.bio(), r.birthDate(), r.gender(), r.city(), r.state(), r.country(),
            r.latitude(), r.longitude(), r.minAge(), r.maxAge(), r.maxDistanceKm(),
            r.discoverable(), r.interests(), r.lookingFor()
        ));
    }

    private static PublicProfileView publicView(ProfileQuery.ProfileView p) {
        int age = Period.between(p.birthDate(), LocalDate.now()).getYears();
        return new PublicProfileView(
            p.userId(), p.displayName(), p.bio(), age, p.gender(),
            p.city(), p.state(), p.country(), p.interests()
        );
    }

    public record PublicProfileView(
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

    public record Request(
        @NotBlank @Size(max = 80) String displayName,
        @Size(max = 1000) String bio,
        @NotNull @Past LocalDate birthDate,
        @NotNull Gender gender,
        @Size(max = 120) String city,
        @Size(max = 120) String state,
        @Size(max = 120) String country,
        @DecimalMin("-90") @DecimalMax("90") Double latitude,
        @DecimalMin("-180") @DecimalMax("180") Double longitude,
        @Min(18) @Max(99) int minAge,
        @Min(18) @Max(99) int maxAge,
        @Min(1) @Max(500) int maxDistanceKm,
        boolean discoverable,
        @Size(max = 30) Set<@Size(max = 80) String> interests,
        @NotEmpty Set<Gender> lookingFor
    ) {
        public Request {
            if (minAge > maxAge) throw new IllegalArgumentException("minAge cannot exceed maxAge");
        }
    }
}
