package com.himeros.interaction;

import java.util.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

interface InteractionRepository extends JpaRepository<Interaction, UUID> {
    Optional<Interaction> findFirstByActorIdAndTargetIdOrderByCreatedAtDesc(UUID actor, UUID target);
    @Query("select distinct i.targetId from Interaction i where i.actorId=:actorId")
    Set<UUID> targets(@Param("actorId") UUID actorId);
    List<Interaction> findByActorIdOrderByCreatedAtDesc(UUID actorId, Pageable pageable);

    @Query(value = """
        select distinct on (target_id) i.*
        from interactions i
        where i.actor_id = :actorId
          and i.target_id in (:targetIds)
        order by i.target_id, i.created_at desc
        """, nativeQuery = true)
    List<Interaction> latestForTargets(@Param("actorId") UUID actorId, @Param("targetIds") Collection<UUID> targetIds);
}
