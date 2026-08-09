package com.ametis.agentfactory.drive;

import com.google.api.client.http.HttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.UserCredentials;
import java.io.FileInputStream;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class GoogleDriveClientFactory {
  private final HttpTransport transport;
  private final JsonFactory jsonFactory;
  private final DriveProperties properties;
  private final DriveConnectionRepository connectionRepository;
  private final DriveTokenCipher tokenCipher;

  public GoogleDriveClientFactory(
      HttpTransport transport,
      JsonFactory jsonFactory,
      DriveProperties properties,
      DriveConnectionRepository connectionRepository,
      DriveTokenCipher tokenCipher) {
    this.transport = transport;
    this.jsonFactory = jsonFactory;
    this.properties = properties;
    this.connectionRepository = connectionRepository;
    this.tokenCipher = tokenCipher;
  }

  public Drive create(UUID tenantId) {
    try {
      GoogleCredentials credentials = connectionRepository.findByTenantId(tenantId)
          .map(connection -> userCredentials(
              tokenCipher.decrypt(tenantId, connection.getEncryptedRefreshToken())))
          .orElseGet(() -> fallbackCredentials(tenantId));
      return create(credentials);
    } catch (ResponseStatusException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new IllegalStateException("Could not initialize Google Drive", exception);
    }
  }

  public Drive createWithRefreshToken(String refreshToken) {
    return create(userCredentials(refreshToken));
  }

  private Drive create(GoogleCredentials credentials) {
    return new Drive.Builder(transport, jsonFactory, new HttpCredentialsAdapter(credentials))
        .setApplicationName(properties.applicationName())
        .build();
  }

  private GoogleCredentials fallbackCredentials(UUID tenantId) {
    String authMode = valueOrDefault(properties.authMode(), "workspace-oauth").toLowerCase(Locale.ROOT);
    return switch (authMode) {
      case "workspace-oauth" -> throw new ResponseStatusException(HttpStatus.CONFLICT, "error.driveNotConnected");
      case "oauth-user" -> userCredentials(require(
          properties.oauthRefreshToken(), "AGENT_FACTORY_GOOGLE_OAUTH_REFRESH_TOKEN"));
      case "service-account" -> serviceAccountCredentials();
      default -> throw new IllegalStateException("Unsupported AGENT_FACTORY_GOOGLE_AUTH_MODE: " + authMode);
    };
  }

  private GoogleCredentials userCredentials(String refreshToken) {
    return UserCredentials.newBuilder()
        .setClientId(require(properties.oauthClientId(), "AGENT_FACTORY_GOOGLE_OAUTH_CLIENT_ID"))
        .setClientSecret(require(properties.oauthClientSecret(), "AGENT_FACTORY_GOOGLE_OAUTH_CLIENT_SECRET"))
        .setRefreshToken(refreshToken)
        .build();
  }

  private GoogleCredentials serviceAccountCredentials() {
    String credentialsFile = require(
        properties.credentialsFile(), "AGENT_FACTORY_GOOGLE_CREDENTIALS_FILE");
    try (FileInputStream input = new FileInputStream(credentialsFile)) {
      return GoogleCredentials.fromStream(input).createScoped(List.of(DriveScopes.DRIVE));
    } catch (Exception exception) {
      throw new IllegalStateException("Could not load Google service account", exception);
    }
  }

  private String require(String value, String variable) {
    if (value == null || value.isBlank()) {
      throw new IllegalStateException(variable + " is required");
    }
    return value;
  }

  private String valueOrDefault(String value, String defaultValue) {
    return value == null || value.isBlank() ? defaultValue : value;
  }
}
