package com.ametis.coreapi.service;

import com.ametis.coreapi.api.dto.AuthLoginRequest;
import com.ametis.coreapi.api.dto.AuthLoginResponse;
import com.ametis.coreapi.api.dto.AuthRegisterRequest;
import com.ametis.coreapi.api.dto.AuthRegisterResponse;
import com.ametis.coreapi.domain.UserEntity;
import com.ametis.coreapi.repository.UserRepository;
import java.net.URI;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class AuthService {
  private final UserRepository userRepository;
  private final RegistrationProvisioningService registrationProvisioningService;
  private final RestClient restClient;
  private final String keycloakBaseUrl;
  private final String realm;
  private final String clientId;
  private final String clientSecret;
  private final Set<String> publicClientIds;
  private final String adminRealm;
  private final String adminClientId;
  private final String adminClientSecret;
  private final String adminUsername;
  private final String adminPassword;

  public AuthService(
      UserRepository userRepository,
      RegistrationProvisioningService registrationProvisioningService,
      RestClient.Builder restClientBuilder,
      @Value("${auth.keycloak.base-url:http://localhost:8081}") String keycloakBaseUrl,
      @Value("${auth.keycloak.realm:ametis}") String realm,
      @Value("${auth.keycloak.client-id:core-api}") String clientId,
      @Value("${auth.keycloak.client-secret:}") String clientSecret,
      @Value("${auth.keycloak.public-client-ids:ametis-hub-web,newsletter-web,agent-factory-web}") String publicClientIds,
      @Value("${auth.keycloak.admin-realm:master}") String adminRealm,
      @Value("${auth.keycloak.admin-client-id:admin-cli}") String adminClientId,
      @Value("${auth.keycloak.admin-client-secret:}") String adminClientSecret,
      @Value("${auth.keycloak.admin-username:}") String adminUsername,
      @Value("${auth.keycloak.admin-password:}") String adminPassword) {
    this.userRepository = userRepository;
    this.registrationProvisioningService = registrationProvisioningService;
    this.restClient = restClientBuilder.build();
    this.keycloakBaseUrl = keycloakBaseUrl;
    this.realm = realm;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.publicClientIds = Arrays.stream(publicClientIds.split(","))
        .map(String::trim)
        .filter(value -> !value.isEmpty())
        .collect(Collectors.toUnmodifiableSet());
    this.adminRealm = adminRealm;
    this.adminClientId = adminClientId;
    this.adminClientSecret = adminClientSecret;
    this.adminUsername = adminUsername;
    this.adminPassword = adminPassword;
  }

  @Transactional
  public AuthRegisterResponse register(AuthRegisterRequest request) {
    userRepository.findByEmail(request.email())
        .ifPresent(existing -> {
          throw new ConflictException("Email already registered in Core.");
        });

    String adminAccessToken = getClientCredentialsToken(adminRealm, adminClientId, adminClientSecret);
    String subject = createIdentityUser(adminAccessToken, request);

    UserEntity user = new UserEntity();
    user.setId(UUID.randomUUID());
    user.setExternalSubject(subject);
    user.setEmail(request.email());
    user.setFullName(request.fullName());
    user.setStatus("ACTIVE");
    userRepository.save(user);
    registrationProvisioningService.provisionInitialWorkspace(user);

    return new AuthRegisterResponse(user.getId(), user.getExternalSubject(), user.getEmail(), user.getFullName());
  }

  public AuthLoginResponse login(AuthLoginRequest request) {
    MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
    form.add("grant_type", "password");
    form.add("client_id", clientId);
    if (clientSecret != null && !clientSecret.isBlank()) {
      form.add("client_secret", clientSecret);
    }
    form.add("username", request.username());
    form.add("password", request.password());
    form.add("scope", "openid profile email");

    try {
      return requestToken(form);
    } catch (HttpStatusCodeException ex) {
      if (ex.getStatusCode().value() == 400 || ex.getStatusCode().value() == 401) {
        throw new AuthenticationException("Invalid username or password.");
      }
      throw new IdentityProviderException("Error authenticating against identity provider: " + ex.getStatusCode());
    }
  }

  public AuthLoginResponse refresh(String refreshToken) {
    MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
    form.add("grant_type", "refresh_token");
    form.add("client_id", clientId);
    if (clientSecret != null && !clientSecret.isBlank()) {
      form.add("client_secret", clientSecret);
    }
    form.add("refresh_token", refreshToken);

    try {
      return requestToken(form);
    } catch (HttpStatusCodeException ex) {
      if (ex.getStatusCode().value() == 400 || ex.getStatusCode().value() == 401) {
        throw new AuthenticationException("Invalid refresh token.");
      }
      throw new IdentityProviderException("Error refreshing token: " + ex.getStatusCode());
    }
  }

  public AuthLoginResponse exchangeAuthorizationCode(
      String requestedClientId, String code, String redirectUri, String codeVerifier) {
    if (!publicClientIds.contains(requestedClientId)) {
      throw new AuthenticationException("OIDC client is not allowed for authorization code exchange.");
    }
    MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
    form.add("grant_type", "authorization_code");
    form.add("client_id", requestedClientId);
    form.add("code", code);
    form.add("redirect_uri", redirectUri);
    if (codeVerifier != null && !codeVerifier.isBlank()) {
      form.add("code_verifier", codeVerifier);
    }

    try {
      return requestToken(form);
    } catch (HttpStatusCodeException ex) {
      if (ex.getStatusCode().value() == 400 || ex.getStatusCode().value() == 401) {
        throw new AuthenticationException("Invalid authorization code.");
      }
      throw new IdentityProviderException("Error exchanging authorization code: " + ex.getStatusCode());
    }
  }

  private String getClientCredentialsToken(String targetRealm, String targetClientId, String targetClientSecret) {
    MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
    form.add("grant_type", "client_credentials");
    form.add("client_id", targetClientId);
    if (targetClientSecret != null && !targetClientSecret.isBlank()) {
      form.add("client_secret", targetClientSecret);
    }

    try {
      Map<String, Object> tokenPayload = restClient.post()
          .uri(tokenUrl(targetRealm))
          .contentType(MediaType.APPLICATION_FORM_URLENCODED)
          .body(form)
          .retrieve()
          .body(Map.class);

      if (tokenPayload == null || tokenPayload.get("access_token") == null) {
        throw new IdentityProviderException("Unable to obtain admin token.");
      }
      return toStringValue(tokenPayload.get("access_token"));
    } catch (HttpStatusCodeException ex) {
      if ((ex.getStatusCode().value() == 400 || ex.getStatusCode().value() == 401)
          && adminUsername != null && !adminUsername.isBlank()
          && adminPassword != null && !adminPassword.isBlank()) {
        return getPasswordGrantToken(targetRealm, targetClientId, targetClientSecret, adminUsername, adminPassword);
      }
      throw new IdentityProviderException("Unable to obtain admin token: " + ex.getStatusCode());
    }
  }

  @SuppressWarnings("unchecked")
  private AuthLoginResponse requestToken(MultiValueMap<String, String> form) {
    Map<String, Object> tokenPayload = restClient.post()
        .uri(tokenUrl(realm))
        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
        .body(form)
        .retrieve()
        .body(Map.class);

    if (tokenPayload == null || tokenPayload.get("access_token") == null) {
      throw new IdentityProviderException("Identity provider returned an invalid token response.");
    }

    return new AuthLoginResponse(
        toStringValue(tokenPayload.get("access_token")),
        toStringValue(tokenPayload.get("refresh_token")),
        toStringValue(tokenPayload.getOrDefault("token_type", "Bearer")),
        toLongValue(tokenPayload.get("expires_in")),
        toLongValue(tokenPayload.get("refresh_expires_in")),
        toStringValue(tokenPayload.get("scope")));
  }

  private String getPasswordGrantToken(
      String targetRealm,
      String targetClientId,
      String targetClientSecret,
      String username,
      String password) {
    MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
    form.add("grant_type", "password");
    form.add("client_id", targetClientId);
    if (targetClientSecret != null && !targetClientSecret.isBlank()) {
      form.add("client_secret", targetClientSecret);
    }
    form.add("username", username);
    form.add("password", password);

    try {
      Map<String, Object> tokenPayload = restClient.post()
          .uri(tokenUrl(targetRealm))
          .contentType(MediaType.APPLICATION_FORM_URLENCODED)
          .body(form)
          .retrieve()
          .body(Map.class);

      if (tokenPayload == null || tokenPayload.get("access_token") == null) {
        throw new IdentityProviderException("Unable to obtain admin token.");
      }
      return toStringValue(tokenPayload.get("access_token"));
    } catch (HttpStatusCodeException ex) {
      throw new IdentityProviderException("Unable to obtain admin token: " + ex.getStatusCode());
    }
  }

  private String createIdentityUser(String adminAccessToken, AuthRegisterRequest request) {
    Map<String, Object> userBody = Map.of(
        "username", request.email(),
        "email", request.email(),
        "enabled", true,
        "firstName", firstName(request.fullName()),
        "lastName", lastName(request.fullName()),
        "credentials", List.of(Map.of(
            "type", "password",
            "value", request.password(),
            "temporary", false)));

    try {
      var response = restClient.post()
          .uri(usersUrl(realm))
          .headers(h -> h.setBearerAuth(adminAccessToken))
          .body(userBody)
          .retrieve()
          .toBodilessEntity();

      URI location = response.getHeaders().getLocation();
      if (location == null) {
        throw new IdentityProviderException("Identity provider did not return user location.");
      }
      String path = location.getPath();
      return path.substring(path.lastIndexOf('/') + 1);
    } catch (HttpStatusCodeException ex) {
      HttpStatusCode status = ex.getStatusCode();
      if (status.value() == 409) {
        throw new ConflictException("User already exists in identity provider.");
      }
      throw new IdentityProviderException("Error creating identity user: " + status);
    }
  }

  public void updateIdentityProfile(UserEntity user, String fullName) {
    String adminAccessToken = getClientCredentialsToken(adminRealm, adminClientId, adminClientSecret);
    Map<String, Object> userBody = Map.of(
        "username", user.getEmail(),
        "email", user.getEmail(),
        "enabled", true,
        "firstName", firstName(fullName),
        "lastName", lastName(fullName));

    try {
      restClient.put()
          .uri(usersUrl(realm) + "/" + user.getExternalSubject())
          .headers(h -> h.setBearerAuth(adminAccessToken))
          .body(userBody)
          .retrieve()
          .toBodilessEntity();
    } catch (HttpStatusCodeException ex) {
      throw new IdentityProviderException("Error updating identity user: " + ex.getStatusCode());
    }
  }

  private String tokenUrl(String targetRealm) {
    return UriComponentsBuilder.fromHttpUrl(keycloakBaseUrl)
        .pathSegment("realms", targetRealm, "protocol", "openid-connect", "token")
        .toUriString();
  }

  private String usersUrl(String targetRealm) {
    return UriComponentsBuilder.fromHttpUrl(keycloakBaseUrl)
        .pathSegment("admin", "realms", targetRealm, "users")
        .toUriString();
  }

  private String firstName(String fullName) {
    String trimmed = fullName.trim();
    int idx = trimmed.indexOf(' ');
    if (idx < 0) return trimmed;
    return trimmed.substring(0, idx);
  }

  private String lastName(String fullName) {
    String trimmed = fullName.trim();
    int idx = trimmed.indexOf(' ');
    if (idx < 0) return "";
    return trimmed.substring(idx + 1).trim();
  }

  private String toStringValue(Object value) {
    return value == null ? null : String.valueOf(value);
  }

  private Long toLongValue(Object value) {
    if (value == null) return null;
    if (value instanceof Number n) return n.longValue();
    try {
      return Long.parseLong(String.valueOf(value));
    } catch (NumberFormatException ex) {
      return null;
    }
  }
}
