package com.himeros.identity;

import static org.junit.jupiter.api.Assertions.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import org.junit.jupiter.api.Test;
class RefreshTokenHashTest { @Test void sha256ProducesExpectedLength() throws Exception {String h=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest("token".getBytes(StandardCharsets.UTF_8)));assertEquals(64,h.length());} }
