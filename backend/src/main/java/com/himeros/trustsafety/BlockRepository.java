package com.himeros.trustsafety;
import java.util.*;import org.springframework.data.jpa.repository.*;import org.springframework.data.repository.query.Param;
interface BlockRepository extends JpaRepository<Block,UUID>{
 boolean existsByBlockerAndBlocked(UUID blocker,UUID blocked);
 void deleteByBlockerAndBlocked(UUID blocker,UUID blocked);
 @Query("select b.blocked from Block b where b.blocker=:u") Set<UUID> blockedBy(@Param("u") UUID u);
 @Query("select b.blocker from Block b where b.blocked=:u") Set<UUID> blockedMe(@Param("u") UUID u);
}
