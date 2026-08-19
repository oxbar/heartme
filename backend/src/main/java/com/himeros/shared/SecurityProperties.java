package com.himeros.shared;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "himeros.security")
public record SecurityProperties(
    String jwtSecret,
    long accessTokenMinutes,
    long refreshTokenDays,
    boolean cookieSecure,
    String cookieSameSite,
    String cookieDomain
) {}
