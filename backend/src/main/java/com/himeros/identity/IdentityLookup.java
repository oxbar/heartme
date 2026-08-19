package com.himeros.identity;
import java.util.UUID;
public interface IdentityLookup { boolean exists(UUID userId); }
