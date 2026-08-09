package com.ametis.agentfactory.drive;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "drive_connections")
public class DriveConnection {
  @Id
  private UUID id;

  @Column(nullable = false, unique = true)
  private UUID tenantId;

  @Column(length = 320)
  private String accountEmail;

  @Column(nullable = false, columnDefinition = "text")
  private String encryptedRefreshToken;

  private UUID connectedBy;

  @Column(nullable = false)
  private OffsetDateTime connectedAt;

  @Column(nullable = false)
  private OffsetDateTime updatedAt;

  protected DriveConnection() {}

  public static DriveConnection create(
      UUID tenantId, String accountEmail, String encryptedRefreshToken, UUID connectedBy) {
    DriveConnection connection = new DriveConnection();
    connection.id = UUID.randomUUID();
    connection.tenantId = tenantId;
    connection.update(accountEmail, encryptedRefreshToken, connectedBy);
    connection.connectedAt = connection.updatedAt;
    return connection;
  }

  public void update(String accountEmail, String encryptedRefreshToken, UUID connectedBy) {
    this.accountEmail = accountEmail;
    this.encryptedRefreshToken = encryptedRefreshToken;
    this.connectedBy = connectedBy;
    this.updatedAt = OffsetDateTime.now();
    this.connectedAt = this.updatedAt;
  }

  public UUID getTenantId() { return tenantId; }
  public String getAccountEmail() { return accountEmail; }
  public String getEncryptedRefreshToken() { return encryptedRefreshToken; }
  public OffsetDateTime getConnectedAt() { return connectedAt; }
}
