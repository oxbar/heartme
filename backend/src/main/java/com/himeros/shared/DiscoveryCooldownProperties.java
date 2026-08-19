package com.himeros.shared;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** Cooldowns shared by interaction recording and discovery eligibility. */
@Component
@ConfigurationProperties(prefix = "himeros.discovery")
public class DiscoveryCooldownProperties {
    private Duration viewCooldown = Duration.ofHours(24);
    private Duration passCooldown = Duration.ofDays(14);
    private Duration likeCooldown = Duration.ofDays(30);
    private Duration superLikeCooldown = Duration.ofDays(30);

    public Duration getViewCooldown() { return viewCooldown; }
    public void setViewCooldown(Duration viewCooldown) { this.viewCooldown = viewCooldown; }
    public Duration getPassCooldown() { return passCooldown; }
    public void setPassCooldown(Duration passCooldown) { this.passCooldown = passCooldown; }
    public Duration getLikeCooldown() { return likeCooldown; }
    public void setLikeCooldown(Duration likeCooldown) { this.likeCooldown = likeCooldown; }
    public Duration getSuperLikeCooldown() { return superLikeCooldown; }
    public void setSuperLikeCooldown(Duration superLikeCooldown) { this.superLikeCooldown = superLikeCooldown; }

    public Duration forType(String type) {
        return switch (type) {
            case "VIEW" -> viewCooldown;
            case "PASS" -> passCooldown;
            case "LIKE" -> likeCooldown;
            case "SUPER_LIKE" -> superLikeCooldown;
            default -> Duration.ZERO;
        };
    }
}
