package com.ametis.agentfactory.analytics;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.UUID;

/**
 * Acceso de cliente a las analíticas de un agente (una fila por agente). El
 * consultor define usuario y contraseña; {@code publicId} es el identificador
 * opaco de la URL que se le entrega al cliente.
 */
@Entity
@Table(name = "agent_analytics_access")
public class AgentAnalyticsAccess {
  private static final SecureRandom RANDOM = new SecureRandom();
  static final int MAX_FAILED_ATTEMPTS = 5;
  static final int LOCK_MINUTES = 15;

  @Id
  private UUID id;

  @Column(nullable = false, updatable = false)
  private UUID tenantId;

  @Column(nullable = false, updatable = false)
  private UUID agentId;

  @Column(nullable = false, updatable = false)
  private String publicId;

  @Column(nullable = false)
  private String username;

  @Column(nullable = false)
  private String passwordHash;

  @Column(nullable = false)
  private boolean published;

  @Column(nullable = false)
  private int failedAttempts;

  private OffsetDateTime lockedUntil;

  private OffsetDateTime lastAccessAt;

  @Column(nullable = false, updatable = false)
  private OffsetDateTime createdAt;

  @Column(nullable = false)
  private OffsetDateTime updatedAt;

  protected AgentAnalyticsAccess() {}

  public static AgentAnalyticsAccess create(UUID tenantId, UUID agentId, String username, String passwordHash) {
    AgentAnalyticsAccess access = new AgentAnalyticsAccess();
    access.id = UUID.randomUUID();
    access.tenantId = tenantId;
    access.agentId = agentId;
    byte[] bytes = new byte[24];
    RANDOM.nextBytes(bytes);
    access.publicId = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    access.username = username;
    access.passwordHash = passwordHash;
    access.createdAt = OffsetDateTime.now();
    access.updatedAt = access.createdAt;
    return access;
  }

  public void update(boolean published, String username) {
    this.published = published;
    this.username = username;
    this.updatedAt = OffsetDateTime.now();
  }

  /** Cambiar la contraseña invalida las sesiones abiertas (el hash entra en la firma del token) y el bloqueo. */
  public void changePassword(String passwordHash) {
    this.passwordHash = passwordHash;
    this.failedAttempts = 0;
    this.lockedUntil = null;
    this.updatedAt = OffsetDateTime.now();
  }

  public boolean isLocked(OffsetDateTime now) {
    return lockedUntil != null && lockedUntil.isAfter(now);
  }

  public void registerFailedLogin(OffsetDateTime now) {
    failedAttempts += 1;
    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      lockedUntil = now.plusMinutes(LOCK_MINUTES);
      failedAttempts = 0;
    }
  }

  public void registerSuccessfulLogin(OffsetDateTime now) {
    failedAttempts = 0;
    lockedUntil = null;
    lastAccessAt = now;
  }

  public UUID getId() { return id; }
  public UUID getTenantId() { return tenantId; }
  public UUID getAgentId() { return agentId; }
  public String getPublicId() { return publicId; }
  public String getUsername() { return username; }
  public String getPasswordHash() { return passwordHash; }
  public boolean isPublished() { return published; }
  public OffsetDateTime getLastAccessAt() { return lastAccessAt; }
}
