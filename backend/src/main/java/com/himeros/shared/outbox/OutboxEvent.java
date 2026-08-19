package com.himeros.shared.outbox;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "outbox_events")
public class OutboxEvent {
    public enum Status { PENDING, PUBLISHED }
    @Id private UUID id;
    @Column(name="aggregate_type", nullable=false) private String aggregateType;
    @Column(name="aggregate_id", nullable=false) private String aggregateId;
    @Column(name="event_type", nullable=false) private String eventType;
    @Column(nullable=false) private String topic;
    @Column(name="message_key", nullable=false) private String messageKey;
    @Column(name="payload_json", nullable=false, columnDefinition="text") private String payloadJson;
    @Column(name="occurred_at", nullable=false) private Instant occurredAt;
    @Column(name="published_at") private Instant publishedAt;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private Status status;
    @Column(nullable=false) private int attempts;
    @Column(name="last_error") private String lastError;

    protected OutboxEvent() {}
    public OutboxEvent(UUID id, String aggregateType, String aggregateId, String eventType, String topic, String messageKey, String payloadJson, Instant occurredAt) {
        this.id=id; this.aggregateType=aggregateType; this.aggregateId=aggregateId; this.eventType=eventType; this.topic=topic; this.messageKey=messageKey; this.payloadJson=payloadJson; this.occurredAt=occurredAt; this.status=Status.PENDING;
    }
    public UUID getId(){return id;} public String getTopic(){return topic;} public String getMessageKey(){return messageKey;} public String getPayloadJson(){return payloadJson;} public Status getStatus(){return status;} public Instant getOccurredAt(){return occurredAt;}
    public void published(){this.status=Status.PUBLISHED; this.publishedAt=Instant.now(); this.lastError=null;}
    public void failed(String message){this.attempts++; this.lastError=message==null?null:message.substring(0, Math.min(1000,message.length()));}
}
