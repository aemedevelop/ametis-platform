package com.ametis.agentfactory.drive;

import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeRequestUrl;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeTokenRequest;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.api.services.drive.model.About;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class GoogleDriveOAuthService {
  private static final Logger LOGGER = LoggerFactory.getLogger(GoogleDriveOAuthService.class);
  private static final SecureRandom SECURE_RANDOM = new SecureRandom();
  private static final int STATE_TTL_MINUTES = 10;

  private final DriveProperties properties;
  private final HttpTransport transport;
  private final JsonFactory jsonFactory;
  private final DriveConnectionRepository connectionRepository;
  private final DriveOAuthStateRepository stateRepository;
  private final DriveTokenCipher tokenCipher;
  private final GoogleDriveClientFactory driveClientFactory;

  public GoogleDriveOAuthService(
      DriveProperties properties,
      HttpTransport transport,
      JsonFactory jsonFactory,
      DriveConnectionRepository connectionRepository,
      DriveOAuthStateRepository stateRepository,
      DriveTokenCipher tokenCipher,
      GoogleDriveClientFactory driveClientFactory) {
    this.properties = properties;
    this.transport = transport;
    this.jsonFactory = jsonFactory;
    this.connectionRepository = connectionRepository;
    this.stateRepository = stateRepository;
    this.tokenCipher = tokenCipher;
    this.driveClientFactory = driveClientFactory;
  }

  public DriveConnectionResponse status(UUID tenantId) {
    return connectionRepository.findByTenantId(tenantId)
        .map(DriveConnectionResponse::connected)
        .orElseGet(() -> DriveConnectionResponse.disconnected(configured()));
  }

  @Transactional
  public DriveAuthorizationResponse authorize(UUID tenantId, UUID userId) {
    requireConfigured();
    String state = randomUrlToken(32);
    String verifier = randomUrlToken(64);
    stateRepository.save(DriveOAuthState.create(
        sha256Hex(state), tenantId, userId, verifier, OffsetDateTime.now().plusMinutes(STATE_TTL_MINUTES)));
    String authorizationUrl = new GoogleAuthorizationCodeRequestUrl(
        properties.oauthClientId(), properties.oauthRedirectUri(), List.of(DriveScopes.DRIVE))
        .setAccessType("offline")
        .setState(state)
        .set("prompt", "consent")
        .set("code_challenge", base64Url(sha256(verifier.getBytes(StandardCharsets.US_ASCII))))
        .set("code_challenge_method", "S256")
        .build();
    return new DriveAuthorizationResponse(authorizationUrl);
  }

  @Transactional
  public URI complete(String state, String code, String oauthError) {
    try {
      requireConfigured();
      DriveOAuthState pendingState = stateRepository.findById(sha256Hex(state == null ? "" : state))
          .orElseThrow(() -> new IllegalArgumentException("Invalid Google OAuth state"));
      stateRepository.delete(pendingState);
      if (pendingState.getExpiresAt().isBefore(OffsetDateTime.now())) {
        throw new IllegalArgumentException("Expired Google OAuth state");
      }
      if (oauthError != null || code == null || code.isBlank()) {
        throw new IllegalArgumentException("Google authorization was not granted");
      }
      GoogleAuthorizationCodeTokenRequest tokenRequest = new GoogleAuthorizationCodeTokenRequest(
          transport,
          jsonFactory,
          properties.oauthClientId(),
          properties.oauthClientSecret(),
          code,
          properties.oauthRedirectUri());
      tokenRequest.set("code_verifier", pendingState.getCodeVerifier());
      GoogleTokenResponse tokenResponse = tokenRequest.execute();
      String refreshToken = tokenResponse.getRefreshToken();
      if (refreshToken == null || refreshToken.isBlank()) {
        throw new IllegalStateException("Google did not return a refresh token");
      }
      Drive drive = driveClientFactory.createWithRefreshToken(refreshToken);
      drive.files().get(properties.rootFolderId()).setSupportsAllDrives(true).setFields("id,name").execute();
      About about = drive.about().get().setFields("user(emailAddress)").execute();
      String email = about.getUser() == null ? null : about.getUser().getEmailAddress();
      String encryptedToken = tokenCipher.encrypt(pendingState.getTenantId(), refreshToken);
      DriveConnection connection = connectionRepository.findByTenantId(pendingState.getTenantId())
          .orElseGet(() -> DriveConnection.create(
              pendingState.getTenantId(), email, encryptedToken, pendingState.getUserId()));
      if (connectionRepository.findByTenantId(pendingState.getTenantId()).isPresent()) {
        connection.update(email, encryptedToken, pendingState.getUserId());
      }
      connectionRepository.save(connection);
      return frontendRedirect("connected");
    } catch (Exception exception) {
      LOGGER.error("Could not complete Google Drive OAuth connection", exception);
      return frontendRedirect("error");
    }
  }

  private boolean configured() {
    return present(properties.oauthClientId())
        && present(properties.oauthClientSecret())
        && present(properties.oauthRedirectUri())
        && present(properties.frontendReturnUri())
        && present(properties.rootFolderId())
        && tokenCipher.configured();
  }

  private void requireConfigured() {
    if (!configured()) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "error.driveOAuthNotConfigured");
    }
  }

  private URI frontendRedirect(String result) {
    String returnUri = properties.frontendReturnUri() == null || properties.frontendReturnUri().isBlank()
        ? "http://localhost:3200"
        : properties.frontendReturnUri();
    return UriComponentsBuilder.fromUriString(returnUri)
        .replaceQueryParam("drive", result)
        .build(true)
        .toUri();
  }

  private boolean present(String value) {
    return value != null && !value.isBlank();
  }

  private String randomUrlToken(int bytes) {
    byte[] value = new byte[bytes];
    SECURE_RANDOM.nextBytes(value);
    return base64Url(value);
  }

  private String sha256Hex(String value) {
    return java.util.HexFormat.of().formatHex(sha256(value.getBytes(StandardCharsets.UTF_8)));
  }

  private byte[] sha256(byte[] value) {
    try {
      return MessageDigest.getInstance("SHA-256").digest(value);
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException(exception);
    }
  }

  private String base64Url(byte[] value) {
    return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
  }
}
