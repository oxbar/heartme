package com.himeros.shared.idempotency;

import java.util.UUID;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

interface ProcessedEventRepository extends JpaRepository<ProcessedEvent,String>{
 @Modifying
 @Query(value="insert into processed_events(id,event_id,consumer_name,processed_at) values (:id,:eventId,:consumer,CURRENT_TIMESTAMP) on conflict do nothing",nativeQuery=true)
 int claim(@Param("id")String id,@Param("eventId")UUID eventId,@Param("consumer")String consumer);
}
