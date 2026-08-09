package com.ametis.agentfactory.drive;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.UUID;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

@Component
public class DriveTokenCipher {
  private static final int NONCE_LENGTH = 12;
  private static final int TAG_LENGTH_BITS = 128;
  private final DriveProperties properties;
  private final SecureRandom secureRandom = new SecureRandom();

  public DriveTokenCipher(DriveProperties properties) {
    this.properties = properties;
  }

  public String encrypt(UUID tenantId, String token) {
    try {
      byte[] nonce = new byte[NONCE_LENGTH];
      secureRandom.nextBytes(nonce);
      Cipher cipher = cipher(Cipher.ENCRYPT_MODE, tenantId, nonce);
      byte[] encrypted = cipher.doFinal(token.getBytes(StandardCharsets.UTF_8));
      return Base64.getEncoder().encodeToString(
          ByteBuffer.allocate(nonce.length + encrypted.length).put(nonce).put(encrypted).array());
    } catch (GeneralSecurityException exception) {
      throw new IllegalStateException("Could not encrypt Google Drive credentials", exception);
    }
  }

  public String decrypt(UUID tenantId, String encryptedToken) {
    try {
      byte[] payload = Base64.getDecoder().decode(encryptedToken);
      if (payload.length <= NONCE_LENGTH) {
        throw new IllegalStateException("Invalid encrypted Google Drive credentials");
      }
      byte[] nonce = new byte[NONCE_LENGTH];
      byte[] encrypted = new byte[payload.length - NONCE_LENGTH];
      System.arraycopy(payload, 0, nonce, 0, nonce.length);
      System.arraycopy(payload, nonce.length, encrypted, 0, encrypted.length);
      return new String(cipher(Cipher.DECRYPT_MODE, tenantId, nonce).doFinal(encrypted), StandardCharsets.UTF_8);
    } catch (GeneralSecurityException | IllegalArgumentException exception) {
      throw new IllegalStateException("Could not decrypt Google Drive credentials", exception);
    }
  }

  public boolean configured() {
    try {
      key();
      return true;
    } catch (IllegalStateException exception) {
      return false;
    }
  }

  private Cipher cipher(int mode, UUID tenantId, byte[] nonce) throws GeneralSecurityException {
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    cipher.init(mode, new SecretKeySpec(key(), "AES"), new GCMParameterSpec(TAG_LENGTH_BITS, nonce));
    cipher.updateAAD(tenantId.toString().getBytes(StandardCharsets.UTF_8));
    return cipher;
  }

  private byte[] key() {
    String configuredKey = properties.tokenEncryptionKey();
    if (configuredKey == null || configuredKey.isBlank()) {
      String clientSecret = properties.oauthClientSecret();
      if (clientSecret == null || clientSecret.isBlank()) {
        throw new IllegalStateException(
            "AGENT_FACTORY_GOOGLE_TOKEN_ENCRYPTION_KEY or AGENT_FACTORY_GOOGLE_OAUTH_CLIENT_SECRET is required");
      }
      try {
        return MessageDigest.getInstance("SHA-256")
            .digest(("ametis-drive-token:" + clientSecret).getBytes(StandardCharsets.UTF_8));
      } catch (java.security.NoSuchAlgorithmException exception) {
        throw new IllegalStateException(exception);
      }
    }
    byte[] key;
    try {
      key = Base64.getDecoder().decode(configuredKey);
    } catch (IllegalArgumentException exception) {
      throw new IllegalStateException("AGENT_FACTORY_GOOGLE_TOKEN_ENCRYPTION_KEY must be Base64", exception);
    }
    if (key.length != 32) {
      throw new IllegalStateException("AGENT_FACTORY_GOOGLE_TOKEN_ENCRYPTION_KEY must contain 32 bytes");
    }
    return key;
  }
}
