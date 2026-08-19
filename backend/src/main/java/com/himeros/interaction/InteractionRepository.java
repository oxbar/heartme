package com.himeros.interaction;
import java.util.*; import org.springframework.data.jpa.repository.*; import org.springframework.data.repository.query.Param;
interface InteractionRepository extends JpaRepository<Interaction,UUID>{
 Optional<Interaction> findByActorIdAndTargetId(UUID actor,UUID target);
 boolean existsByActorIdAndTargetIdAndTypeIn(UUID actor,UUID target,Collection<Interaction.Type> types);
 @Query("select i.targetId from Interaction i where i.actorId=:actorId") Set<UUID> targets(@Param("actorId") UUID actorId);
}
