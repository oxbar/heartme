package com.himeros.shared.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OutboxService {
    private final OutboxRepository repo; private final ObjectMapper mapper;
    public OutboxService(OutboxRepository repo, ObjectMapper mapper){this.repo=repo;this.mapper=mapper;}

    @Transactional
    public UUID append(String aggregateType, Object aggregateId, String eventType, String topic, Object key, Object payload) {
        try {
            UUID eventId=UUID.randomUUID();
            Map<String,Object> envelope=new LinkedHashMap<>();
            envelope.put("eventId", eventId); envelope.put("eventType",eventType); envelope.put("aggregateType",aggregateType); envelope.put("aggregateId",String.valueOf(aggregateId)); envelope.put("occurredAt",Instant.now()); envelope.put("schemaVersion",1); envelope.put("payload",payload);
            repo.save(new OutboxEvent(eventId,aggregateType,String.valueOf(aggregateId),eventType,topic,String.valueOf(key),mapper.writeValueAsString(envelope),Instant.now()));
            return eventId;
        } catch (Exception e) { throw new IllegalStateException("Unable to serialize outbox event",e); }
    }
}
