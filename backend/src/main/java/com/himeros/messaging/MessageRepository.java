package com.himeros.messaging;

import java.time.Instant;
import java.util.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

interface MessageRepository extends JpaRepository<Message,UUID> {
    Optional<Message> findByIdAndConversationId(UUID id, UUID conversationId);
    @Query("select m from Message m where m.conversationId=:c order by m.sentAt desc")
    List<Message> latest(@Param("c") UUID c, Pageable pageable);

    @Query("select m from Message m where m.conversationId=:c and m.sentAt<:before order by m.sentAt desc")
    List<Message> before(@Param("c") UUID c, @Param("before") Instant before, Pageable pageable);

    @Query("select m.conversationId, count(m), max(m.sentAt) from Message m " +
           "where m.conversationId in :conversationIds and m.senderId=:sender group by m.conversationId")
    List<Object[]> engagementByConversationIds(@Param("conversationIds") Collection<UUID> conversationIds,
                                                @Param("sender") UUID sender);

    @Modifying
    @Query("update Message m set m.readAt=CURRENT_TIMESTAMP where m.conversationId=:c and m.senderId<>:reader and m.readAt is null")
    int markRead(@Param("c") UUID c,@Param("reader") UUID reader);
}
