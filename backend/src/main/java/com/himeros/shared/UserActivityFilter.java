package com.himeros.shared;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.time.*;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class UserActivityFilter extends OncePerRequestFilter {
    private static final Duration THROTTLE = Duration.ofMinutes(5);
    private final ApplicationEventPublisher events;
    private final StringRedisTemplate redis;

    public UserActivityFilter(ApplicationEventPublisher events, StringRedisTemplate redis) {
        this.events = events; this.redis = redis;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        observeAuthenticatedActivity();
        chain.doFilter(request, response);
    }

    private void observeAuthenticatedActivity() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return;
        Object principal = auth.getPrincipal();
        String subject = principal instanceof Jwt jwt ? jwt.getSubject() : null;
        if (subject == null) return;
        try {
            UUID userId = UUID.fromString(subject);
            if (shouldPublish(userId)) events.publishEvent(new UserActivityObserved(userId, Instant.now()));
        } catch (IllegalArgumentException ignored) {
            // Non-UUID principals are not profile users.
        } catch (RuntimeException ignored) {
            // Presence tracking must never make an authenticated business request fail.
        }
    }

    private boolean shouldPublish(UUID userId) {
        try {
            Boolean first = redis.opsForValue().setIfAbsent("activity:v1:" + userId, "1", THROTTLE);
            return Boolean.TRUE.equals(first);
        } catch (RuntimeException redisUnavailable) {
            // PostgreSQL has a second conditional 5-minute guard.
            return true;
        }
    }
}
