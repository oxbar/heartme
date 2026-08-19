package com.himeros.shared;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class RateLimitFilter extends OncePerRequestFilter {
    private final StringRedisTemplate redis;
    public RateLimitFilter(StringRedisTemplate redis) { this.redis = redis; }

    @Override protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/v1/auth/");
    }

    @Override protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
        String ip = req.getHeader("X-Forwarded-For");
        if (ip == null || ip.isBlank()) ip = req.getRemoteAddr();
        String key = "rl:auth:" + ip.split(",")[0].trim();
        try {
            Long count = redis.opsForValue().increment(key);
            if (count != null && count == 1) redis.expire(key, Duration.ofMinutes(1));
            if (count != null && count > 30) {
                res.setStatus(429);
                res.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
                res.getWriter().write("{\"title\":\"Too Many Requests\",\"status\":429,\"detail\":\"Authentication rate limit exceeded\"}");
                return;
            }
        } catch (RuntimeException ignored) {
            // Fail-open so an unavailable cache does not become an authentication outage.
        }
        chain.doFilter(req, res);
    }
}
