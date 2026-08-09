package com.ametis.agentfactory.drive;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "drive_oauth_states")
public class DriveOAuthState {
  @Id
  @Column(length = 64)
  private String stateHash;

  @Column(nullable = false)
  private UUID tenantId;

  private UUID userId;

  @Column(nullable = false, length = 128)
  private String codeVerifier;

  @Column(nullable = false)
  private OffsetDateTime expiresAt;

  @Column(nullable = false)
  private OffsetDateTime createdAt;

  protected DriveOAuthState() {}

  public static DriveOAuthState create(
      String stateHash, UUID tenantId, UUID userId, String codeVerifier, OffsetDateTime expiresAt) {
    DriveOAuthState state = new DriveOAuthState();
    state.stateHash = stateHash;
    state.tenantId = tenantId;
    state.userId = userId;
    state.codeVerifier = codeVerifier;
    state.expiresAt = expiresAt;
    state.createdAt = OffsetDateTime.now();
    return state;
  }

  public UUID getTenantId() { return tenantId; }
  public UUID getUserId() { return userId; }
  public String getCodeVerifier() { return codeVerifier; }
  public OffsetDateTime getExpiresAt() { return expiresAt; }
}
