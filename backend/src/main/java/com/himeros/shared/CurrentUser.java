package com.himeros.shared;

import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
public class CurrentUser {
    public UUID id() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) throw new ForbiddenException("Authentication required");
        Object principal = auth.getPrincipal();
        String subject = principal instanceof Jwt jwt ? jwt.getSubject() : auth.getName();
        try { return UUID.fromString(subject); }
        catch (Exception ex) { throw new ForbiddenException("Invalid authenticated principal"); }
    }
}
