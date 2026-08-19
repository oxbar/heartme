package com.himeros.messaging;

import com.himeros.shared.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/conversations")
public class MessagingController {
    private final MessagingService service;
    private final CurrentUser current;

    public MessagingController(MessagingService service, CurrentUser current) {
        this.service = service;
        this.current = current;
    }

    @GetMapping
    List<MessagingService.ConversationView> list() {
        return service.list(current.id());
    }

    @GetMapping("/{id}/messages")
    List<MessagingService.MessageView> history(@PathVariable UUID id,
            @RequestParam(required = false) Instant before,
            @RequestParam(defaultValue = "50") @Min(1) @Max(100) int limit) {
        return service.history(current.id(), id, before, limit);
    }

    @PostMapping("/{id}/messages")
    MessagingService.MessageView send(@PathVariable UUID id, @Valid @RequestBody SendRequest request) {
        return service.send(current.id(), id, request.content());
    }

    @PostMapping("/{id}/read")
    Map<String, Integer> read(@PathVariable UUID id) {
        return Map.of("updated", service.markRead(current.id(), id));
    }

    @PutMapping("/{conversationId}/messages/{messageId}/heart")
    MessagingService.ReactionView toggleHeart(@PathVariable UUID conversationId, @PathVariable UUID messageId) {
        return service.toggleHeart(current.id(), conversationId, messageId);
    }

    public record SendRequest(@NotBlank @Size(max = 4000) String content) {}
}
