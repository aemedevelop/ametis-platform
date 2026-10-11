package com.ametis.agentfactory.analytics;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Tokens de sesión del acceso de cliente a analíticas: "{accessId}.{exp}"
 * firmado con HMAC-SHA256. Son propios y ajenos a Keycloak: el cliente no es
 * usuario de la plataforma. El hash de la contraseña entra en la firma, así
 * que cambiar la contraseña invalida las sesiones abiertas.
 */
@Component
public class AnalyticsAccessTokens {
  private static final Logger LOGGER = LoggerFactory.getLogger(AnalyticsAccessTokens.class);
  private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
  private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

  private final byte[] secret;

  public AnalyticsAccessTokens(@Value("${agent-factory.analytics-access.session-secret:}") String configuredSecret) {
    if (configuredSecret == null || configuredSecret.isBlank()) {
      // Sin secreto configurado las sesiones siguen siendo seguras, pero se
      // invalidan en cada reinicio (y no valdrían con varias réplicas).
      LOGGER.warn("AGENT_FACTORY_ANALYTICS_SESSION_SECRET no definido: se usa un secreto aleatorio por arranque");
      secret = new byte[32];
      new SecureRandom().nextBytes(secret);
    } else {
      secret = configuredSecret.getBytes(StandardCharsets.UTF_8);
    }
  }

  public String issue(AgentAnalyticsAccess access, Instant expiresAt) {
    String payload = access.getId() + "." + expiresAt.getEpochSecond();
    return ENCODER.encodeToString(payload.getBytes(StandardCharsets.UTF_8))
        + "." + ENCODER.encodeToString(sign(payload, access));
  }

  public boolean isValid(String token, AgentAnalyticsAccess access, Instant now) {
    if (token == null) {
      return false;
    }
    try {
      String[] parts = token.split("\\.");
      if (parts.length != 2) {
        return false;
      }
      String payload = new String(DECODER.decode(parts[0]), StandardCharsets.UTF_8);
      String[] fields = payload.split("\\.");
      if (fields.length != 2 || !fields[0].equals(access.getId().toString())) {
        return false;
      }
      if (Long.parseLong(fields[1]) <= now.getEpochSecond()) {
        return false;
      }
      return MessageDigest.isEqual(DECODER.decode(parts[1]), sign(payload, access));
    } catch (IllegalArgumentException exception) {
      return false;
    }
  }

  private byte[] sign(String payload, AgentAnalyticsAccess access) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret, "HmacSHA256"));
      return mac.doFinal((payload + "." + access.getPasswordHash()).getBytes(StandardCharsets.UTF_8));
    } catch (GeneralSecurityException exception) {
      throw new IllegalStateException(exception);
    }
  }
}
