package com.himeros.shared.idempotency;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="processed_events")
class ProcessedEvent {
 @Id private String id; @Column(name="event_id",nullable=false) private UUID eventId; @Column(name="consumer_name",nullable=false) private String consumerName; @Column(name="processed_at",nullable=false) private Instant processedAt;
 protected ProcessedEvent(){} ProcessedEvent(UUID eventId,String consumer){this.id=consumer+":"+eventId;this.eventId=eventId;this.consumerName=consumer;this.processedAt=Instant.now();}
}
