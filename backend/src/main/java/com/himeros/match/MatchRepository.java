package com.himeros.match;

import java.time.Instant;
import java.util.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

interface MatchRepository extends JpaRepository<Match,UUID> {
    @Query("select m from Match m where m.userA=:u or m.userB=:u order by m.createdAt desc")
    List<Match> findForUser(@Param("u") UUID u);
    Optional<Match> findByUserAAndUserB(UUID a,UUID b);

    @Query("select case when m.userA=:u then m.userB else m.userA end from Match m " +
           "where (m.userA=:u or m.userB=:u) and m.status=:status")
    List<UUID> counterpartsByStatus(@Param("u") UUID u, @Param("status") Match.Status status);

    @Query("select case when m.userA=:u then m.userB else m.userA end from Match m " +
           "where (m.userA=:u or m.userB=:u) and m.status=:status and m.unmatchedAt>:since")
    List<UUID> unmatchedCounterpartsSince(@Param("u") UUID u, @Param("status") Match.Status status, @Param("since") Instant since);

    @Query("select m from Match m where m.userA=:u or m.userB=:u order by coalesce(m.unmatchedAt,m.createdAt) desc")
    List<Match> findSignalsForUser(@Param("u") UUID u, Pageable pageable);
}
