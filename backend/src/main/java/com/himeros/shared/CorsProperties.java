package com.himeros.shared;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "himeros.cors")
public record CorsProperties(List<String> allowedOrigins) {}
