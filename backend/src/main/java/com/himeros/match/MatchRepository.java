package com.himeros.match;

import java.time.Instant;
import java.util.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

interface MatchRepository extends JpaRepository<Match, UUID> {
    @Query("select m from Match m where (m.userA=:u or m.userB=:u) and m.status=:status order by m.createdAt desc")
    List<Match> findForUserByStatus(@Param("u") UUID u, @Param("status") Match.Status status);

    Optional<Match> findByUserAAndUserB(UUID a, UUID b);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = """
        update matches
           set status = 'ACTIVE', unmatched_at = null, created_at = :activatedAt
         where user_a = :a and user_b = :b and status = 'UNMATCHED'
        """, nativeQuery = true)
    int reactivatePair(@Param("a") UUID a, @Param("b") UUID b, @Param("activatedAt") Instant activatedAt);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = """
        insert into matches(id, user_a, user_b, status, created_at, unmatched_at)
        values (:id, :a, :b, 'ACTIVE', :createdAt, null)
        on conflict (user_a, user_b) do nothing
        """, nativeQuery = true)
    int insertActiveIfAbsent(@Param("id") UUID id, @Param("a") UUID a, @Param("b") UUID b,
            @Param("createdAt") Instant createdAt);

    @Query("select case when m.userA=:u then m.userB else m.userA end from Match m " +
           "where (m.userA=:u or m.userB=:u) and m.status=:status")
    List<UUID> counterpartsByStatus(@Param("u") UUID u, @Param("status") Match.Status status);

    @Query("select case when m.userA=:u then m.userB else m.userA end from Match m " +
           "where (m.userA=:u or m.userB=:u) and m.status=:status and m.unmatchedAt>:since")
    List<UUID> unmatchedCounterpartsSince(@Param("u") UUID u, @Param("status") Match.Status status,
            @Param("since") Instant since);

    @Query("select m from Match m where m.userA=:u or m.userB=:u order by coalesce(m.unmatchedAt,m.createdAt) desc")
    List<Match> findSignalsForUser(@Param("u") UUID u, Pageable pageable);
}
