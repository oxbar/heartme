package com.himeros.notification;

import com.fasterxml.jackson.databind.*;
import com.himeros.messaging.MessageSent;
import com.himeros.shared.*;
import com.himeros.shared.idempotency.IdempotencyService;
import java.util.*;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.PageRequest;
import org.springframework.kafka.annotation.*;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {
    private final NotificationRepository repo;
    private final IdempotencyService idempotency;
    private final ObjectMapper mapper;

    public NotificationService(NotificationRepository repo, IdempotencyService idempotency, ObjectMapper mapper) {
        this.repo = repo;
        this.idempotency = idempotency;
        this.mapper = mapper;
    }

    @RetryableTopic(attempts = "4", backoff = @Backoff(delay = 1000, multiplier = 2.0), dltTopicSuffix = "-dlt")
    @KafkaListener(topics = "himeros.match.events.v1", groupId = "notification-dispatcher")
    public void onMatch(String json) {
        try {
            JsonNode root = mapper.readTree(json);
            UUID eventId = UUID.fromString(root.path("eventId").asText());
            idempotency.executeOnce(eventId, "notification-dispatcher", () -> {
                JsonNode payload = root.path("payload");
                UUID matchId = UUID.fromString(payload.path("matchId").asText());
                UUID userA = UUID.fromString(payload.path("userA").asText());
                UUID userB = UUID.fromString(payload.path("userB").asText());
                String data = "{\"matchId\":\"" + matchId + "\"}";
                repo.save(new Notification(userA, "MATCH", "Novo match!", "Vocês deram match.", data));
                repo.save(new Notification(userB, "MATCH", "Novo match!", "Vocês deram match.", data));
            });
        } catch (Exception ex) {
            throw new IllegalStateException("Invalid match event", ex);
        }
    }

    @EventListener
    @Transactional
    public void onMessage(MessageSent event) {
        String data = "{\"conversationId\":\"" + event.conversationId() + "\",\"senderId\":\"" + event.senderId() + "\"}";
        repo.save(new Notification(event.recipientId(), "MESSAGE", "Nova mensagem", "Você recebeu uma nova mensagem.", data));
    }

    @DltHandler
    public void dlt(String json) {
        // retained in Kafka DLT for operational replay
    }

    @Transactional(readOnly = true)
    public List<View> list(UUID user, int limit) {
        return repo.list(user, PageRequest.of(0, Math.min(Math.max(limit, 1), 100))).stream()
            .map(NotificationService::view).toList();
    }

    @Transactional
    public void read(UUID user, UUID id) {
        Notification notification = repo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        if (!notification.user().equals(user)) throw new ForbiddenException("Not your notification");
        notification.markRead();
    }

    @Transactional
    public long clear(UUID user) {
        return repo.deleteByUserId(user);
    }

    private static View view(Notification notification) {
        return new View(notification.id(), notification.type(), notification.title(), notification.body(),
            notification.data(), notification.read(), notification.created());
    }

    public record View(UUID id, String type, String title, String body, String dataJson,
            java.time.Instant readAt, java.time.Instant createdAt) {}
}
