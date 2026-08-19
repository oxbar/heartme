package com.himeros.recommendation;

import com.himeros.interaction.InteractionQuery;
import com.himeros.shared.DiscoveryCooldownProperties;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class CooldownPolicy {
    private final DiscoveryCooldownProperties properties;

    public CooldownPolicy(DiscoveryCooldownProperties properties) {
        this.properties = properties;
    }

    public Optional<Instant> cooldownUntil(InteractionQuery.InteractionView interaction) {
        Duration duration = properties.forType(interaction.type());
        if (duration.isZero() || duration.isNegative()) return Optional.empty();
        return Optional.of(interaction.createdAt().plus(duration));
    }

    public boolean suppressed(InteractionQuery.InteractionView interaction, Instant now) {
        return cooldownUntil(interaction).map(until -> now.isBefore(until)).orElse(false);
    }
}
