package com.himeros.notification;

import com.himeros.shared.CurrentUser;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private final NotificationService service;
    private final CurrentUser current;

    public NotificationController(NotificationService service, CurrentUser current) {
        this.service = service;
        this.current = current;
    }

    @GetMapping
    List<NotificationService.View> list(@RequestParam(defaultValue = "30") @Min(1) @Max(100) int limit) {
        return service.list(current.id(), limit);
    }

    @PostMapping("/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void read(@PathVariable UUID id) {
        service.read(current.id(), id);
    }

    @DeleteMapping
    Map<String, Long> clear() {
        return Map.of("deleted", service.clear(current.id()));
    }
}
