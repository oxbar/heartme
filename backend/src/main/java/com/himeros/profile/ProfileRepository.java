package com.himeros.profile;

import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

interface ProfileRepository extends JpaRepository<Profile, UUID> {
    Page<Profile> findByDiscoverableTrueAndUserIdNot(UUID userId, Pageable pageable);

    @Modifying
    @Query("update Profile p set p.lastActiveAt=:at where p.userId=:userId and (p.lastActiveAt is null or p.lastActiveAt<:threshold)")
    int touchActivity(@Param("userId") UUID userId, @Param("at") java.time.Instant at, @Param("threshold") java.time.Instant threshold);

    @Query(value = """
        select p.*
        from profiles p
        where p.discoverable = true
          and p.user_id <> :userId
          and (
            :globalMode = true
            or :radiusKm is null
            or :latitude is null
            or :longitude is null
            or p.latitude is null
            or p.longitude is null
            or ST_DWithin(
                ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)::geography,
                ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
                (:radiusKm * 1000.0)
            )
          )
        order by p.last_active_at desc nulls last, p.updated_at desc, p.user_id
        limit :limit
        """, nativeQuery = true)
    List<Profile> findDiscoveryCandidates(
        @Param("userId") UUID userId,
        @Param("latitude") Double latitude,
        @Param("longitude") Double longitude,
        @Param("radiusKm") Integer radiusKm,
        @Param("globalMode") boolean globalMode,
        @Param("limit") int limit
    );
}
