package com.himeros.match;

import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

interface MatchRepository extends JpaRepository<Match,UUID> {
    @Query("select m from Match m where m.userA=:u or m.userB=:u order by m.createdAt desc")
    List<Match> findForUser(@Param("u") UUID u);
    Optional<Match> findByUserAAndUserB(UUID a,UUID b);
}
