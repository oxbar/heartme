package com.himeros.identity;

import com.himeros.shared.CurrentUser;
import com.himeros.shared.SecurityProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Duration;
import java.time.Instant;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private static final String REFRESH_COOKIE = "himeros_refresh";

    private final AuthService service;
    private final CurrentUser current;
    private final SecurityProperties security;

    public AuthController(AuthService service, CurrentUser current, SecurityProperties security) {
        this.service = service;
        this.current = current;
        this.security = security;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    AuthService.UserView register(@Valid @RequestBody RegisterRequest request) {
        return service.register(request.email(), request.password());
    }

    /** Native/mobile contract: refresh token travels in the JSON response. */
    @PostMapping("/login")
    AuthService.TokenPair login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        return service.login(request.email(), request.password(), device(servletRequest));
    }

    /** Native/mobile contract: caller owns refresh-token storage. */
    @PostMapping("/refresh")
    AuthService.TokenPair refresh(@Valid @RequestBody RefreshRequest request, HttpServletRequest servletRequest) {
        return service.rotate(request.refreshToken(), device(servletRequest));
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void logout(@Valid @RequestBody RefreshRequest request) {
        service.logout(request.refreshToken());
    }

    /**
     * Browser contract: access token is returned in JSON while the rotating refresh token
     * stays in an HttpOnly cookie. This keeps refresh credentials out of JavaScript storage.
     */
    @PostMapping("/web/login")
    ResponseEntity<WebToken> webLogin(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        AuthService.TokenPair pair = service.login(request.email(), request.password(), device(servletRequest));
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, refreshCookie(pair.refreshToken(), false).toString())
            .body(WebToken.from(pair));
    }

    @PostMapping("/web/refresh")
    ResponseEntity<WebToken> webRefresh(
        @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken,
        HttpServletRequest servletRequest
    ) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        AuthService.TokenPair pair = service.rotate(refreshToken, device(servletRequest));
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, refreshCookie(pair.refreshToken(), false).toString())
            .body(WebToken.from(pair));
    }

    @PostMapping("/web/logout")
    ResponseEntity<Void> webLogout(@CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            service.logout(refreshToken);
        }
        return ResponseEntity.noContent()
            .header(HttpHeaders.SET_COOKIE, refreshCookie("", true).toString())
            .build();
    }

    @PostMapping("/logout-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void logoutAll() {
        service.logoutAll(current.id());
    }

    private ResponseCookie refreshCookie(String value, boolean delete) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(REFRESH_COOKIE, value)
            .httpOnly(true)
            .secure(security.cookieSecure())
            .sameSite(security.cookieSameSite() == null || security.cookieSameSite().isBlank() ? "Lax" : security.cookieSameSite())
            .path("/api/v1/auth/web")
            .maxAge(delete ? Duration.ZERO : Duration.ofDays(security.refreshTokenDays()));

        if (security.cookieDomain() != null && !security.cookieDomain().isBlank()) {
            builder.domain(security.cookieDomain());
        }
        return builder.build();
    }

    private static String device(HttpServletRequest request) {
        String ua = request.getHeader("User-Agent");
        return ua == null ? "unknown" : ua.substring(0, Math.min(500, ua.length()));
    }

    public record RegisterRequest(@Email @NotBlank String email, @Size(min = 10, max = 128) String password) {}
    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}
    public record RefreshRequest(@NotBlank String refreshToken) {}
    public record WebToken(String accessToken, String tokenType, Instant accessExpiresAt) {
        static WebToken from(AuthService.TokenPair pair) {
            return new WebToken(pair.accessToken(), pair.tokenType(), pair.accessExpiresAt());
        }
    }
}
