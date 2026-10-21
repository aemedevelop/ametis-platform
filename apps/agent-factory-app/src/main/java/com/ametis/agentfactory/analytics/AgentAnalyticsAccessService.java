package com.ametis.agentfactory.analytics;

import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Acceso de cliente a las analíticas de un agente: el consultor lo publica
 * con usuario y contraseña, y el cliente entra con ellos por la URL pública.
 * No caduca: vale mientras el agente exista y el acceso siga publicado.
 */
@Service
public class AgentAnalyticsAccessService {
  private static final int SESSION_HOURS = 8;
  private static final int MIN_PASSWORD_LENGTH = 8;
  // BCrypt ignora lo que pase de 72 bytes.
  private static final int MAX_PASSWORD_LENGTH = 72;

  private final AgentAnalyticsAccessRepository accessRepository;
  private final AgentAnalyticsService analyticsService;
  private final AnalyticsAccessTokens tokens;
  private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

  public AgentAnalyticsAccessService(
      AgentAnalyticsAccessRepository accessRepository,
      AgentAnalyticsService analyticsService,
      AnalyticsAccessTokens tokens) {
    this.accessRepository = accessRepository;
    this.analyticsService = analyticsService;
    this.tokens = tokens;
  }

  /** {@code publicId} es null mientras el acceso no se haya configurado nunca. */
  public record AccessResponse(boolean published, String username, String publicId, OffsetDateTime lastAccessAt) {}

  /** {@code password} vacío = conservar la actual (obligatoria la primera vez). */
  public record AccessRequest(boolean published, String username, String password) {}

  public record LoginRequest(String username, String password) {}

  public record SessionResponse(String token, OffsetDateTime expiresAt, String agentName) {}

  /** Acceso ya validado de una petición del cliente. */
  public record ClientContext(UUID tenantId, UUID agentId, String agentName) {}

  public AccessResponse get(UUID tenantId, UUID agentId) {
    analyticsService.agentName(tenantId, agentId);
    return accessRepository.findByTenantIdAndAgentId(tenantId, agentId)
        .map(this::toResponse)
        .orElseGet(() -> new AccessResponse(false, "", null, null));
  }

  public AccessResponse save(UUID tenantId, UUID agentId, AccessRequest request) {
    analyticsService.agentName(tenantId, agentId);
    String username = request.username() == null ? "" : request.username().trim();
    if (username.isEmpty() || username.length() > 120) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "error.analyticsAccessUsernameRequired");
    }
    String password = request.password() == null ? "" : request.password();
    AgentAnalyticsAccess access = accessRepository.findByTenantIdAndAgentId(tenantId, agentId).orElse(null);
    if (access == null) {
      requireValidPassword(password);
      access = AgentAnalyticsAccess.create(tenantId, agentId, username, passwordEncoder.encode(password));
    } else if (!password.isEmpty()) {
      requireValidPassword(password);
      access.changePassword(passwordEncoder.encode(password));
    }
    access.update(request.published(), username);
    return toResponse(accessRepository.save(access));
  }

  // Sin @Transactional a propósito: el intento fallido debe quedar guardado
  // aunque la petición termine en error.
  public SessionResponse login(String publicId, LoginRequest request) {
    AgentAnalyticsAccess access = requirePublished(publicId);
    String agentName = requireAgentName(access);
    OffsetDateTime now = OffsetDateTime.now();
    if (access.isLocked(now)) {
      throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "error.analyticsAccessLocked");
    }
    String username = request == null || request.username() == null ? "" : request.username().trim();
    String password = request == null || request.password() == null ? "" : request.password();
    boolean passwordMatches = password.length() <= MAX_PASSWORD_LENGTH
        && passwordEncoder.matches(password, access.getPasswordHash());
    if (!passwordMatches || !username.equalsIgnoreCase(access.getUsername())) {
      access.registerFailedLogin(now);
      accessRepository.save(access);
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "error.analyticsAccessInvalidCredentials");
    }
    access.registerSuccessfulLogin(now);
    accessRepository.save(access);
    OffsetDateTime expiresAt = now.plusHours(SESSION_HOURS);
    return new SessionResponse(tokens.issue(access, expiresAt.toInstant()), expiresAt, agentName);
  }

  public ClientContext authorize(String publicId, String sessionToken) {
    AgentAnalyticsAccess access = requirePublished(publicId);
    String agentName = requireAgentName(access);
    if (!tokens.isValid(sessionToken, access, OffsetDateTime.now().toInstant())) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "error.analyticsAccessSessionExpired");
    }
    return new ClientContext(access.getTenantId(), access.getAgentId(), agentName);
  }

  private AgentAnalyticsAccess requirePublished(String publicId) {
    return accessRepository.findByPublicId(publicId)
        .filter(AgentAnalyticsAccess::isPublished)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.analyticsAccessNotFound"));
  }

  private String requireAgentName(AgentAnalyticsAccess access) {
    try {
      return analyticsService.agentName(access.getTenantId(), access.getAgentId());
    } catch (ResponseStatusException exception) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "error.analyticsAccessNotFound");
    }
  }

  private void requireValidPassword(String password) {
    if (password.length() < MIN_PASSWORD_LENGTH || password.length() > MAX_PASSWORD_LENGTH) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "error.analyticsAccessPasswordInvalid");
    }
  }

  private AccessResponse toResponse(AgentAnalyticsAccess access) {
    return new AccessResponse(access.isPublished(), access.getUsername(), access.getPublicId(), access.getLastAccessAt());
  }
}
