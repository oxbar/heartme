package com.himeros.messaging;

import java.util.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

interface ConversationRepository extends JpaRepository<Conversation,UUID> {
    Optional<Conversation> findByMatchId(UUID matchId);
    @Query("select c from Conversation c where c.userA=:u or c.userB=:u order by coalesce(c.lastMessageAt,c.createdAt) desc")
    List<Conversation> findForUser(@Param("u") UUID u);
    @Query("select c from Conversation c where c.userA=:u or c.userB=:u order by coalesce(c.lastMessageAt,c.createdAt) desc")
    List<Conversation> findRecentForUser(@Param("u") UUID u, Pageable pageable);
}
