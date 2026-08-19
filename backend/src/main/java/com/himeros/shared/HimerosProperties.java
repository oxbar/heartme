package com.himeros.shared;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "himeros.media")
public record HimerosProperties(String directory, String publicBaseUrl) {}
