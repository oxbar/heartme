package com.himeros.recommendation;

import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.stereotype.Component;

@Component
public class DiscoveryCursorCodec {
    public String encode(UUID lastUserId) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(lastUserId.toString().getBytes(StandardCharsets.UTF_8));
    }

    public Optional<UUID> decode(String cursor) {
        if (cursor == null || cursor.isBlank()) return Optional.empty();
        try {
            String value = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            return Optional.of(UUID.fromString(value));
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
    }
}
