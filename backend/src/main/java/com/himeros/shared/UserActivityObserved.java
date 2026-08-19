package com.himeros.shared;

import java.time.Instant;
import java.util.UUID;

public record UserActivityObserved(UUID userId, Instant at) {}
