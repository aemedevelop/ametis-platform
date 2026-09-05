package com.ametis.agentfactory.deployments;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.UUID;

@Entity
@Table(name = "agent_deployments")
public class AgentDeployment {
  private static final SecureRandom RANDOM = new SecureRandom();

  @Id
  private UUID id;

  @Column(nullable = false)
  private UUID tenantId;

  @Column(nullable = false)
  private UUID agentId;

  /**
   * Identificador público y opaco del canal (32 hex). Es lo que viaja en la URL
   * de consumo ({@code /public/{publicId}}); no expone tenant ni namespace. No
   * cambia al renombrar el despliegue ni su slug; solo se modifica de forma
   * explícita con {@link #regeneratePublicId()}.
   */
  @Column(nullable = false, length = 48, unique = true)
  private String publicId;

  @Column(nullable = false, length = 120)
  private String name;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private DeploymentChannelType channelType;

  @Column(nullable = false, length = 80)
  private String deploymentSlug;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private DeploymentStatus status;

  @Column(length = 120)
  private String apiKey;

  @Column(length = 500)
  private String welcomeMessage;

  private Integer rateLimitPerMinute;

  private Integer rateLimitPerDay;

  @Column(length = 1000)
  private String allowedOrigins;

  private UUID createdBy;

  @Column(nullable = false)
  private OffsetDateTime createdAt;

  @Column(nullable = false)
  private OffsetDateTime updatedAt;

  protected AgentDeployment() {}

  public static AgentDeployment create(
      UUID tenantId,
      UUID agentId,
      String name,
      DeploymentChannelType channelType,
      String deploymentSlug,
      String apiKey,
      String welcomeMessage,
      Integer rateLimitPerMinute,
      Integer rateLimitPerDay,
      String allowedOrigins,
      UUID createdBy) {
    AgentDeployment deployment = new AgentDeployment();
    deployment.id = UUID.randomUUID();
    deployment.publicId = generatePublicId();
    deployment.tenantId = tenantId;
    deployment.agentId = agentId;
    deployment.name = name;
    deployment.channelType = channelType;
    deployment.deploymentSlug = deploymentSlug;
    deployment.status = DeploymentStatus.ACTIVE;
    deployment.apiKey = apiKey;
    deployment.welcomeMessage = welcomeMessage;
    deployment.rateLimitPerMinute = rateLimitPerMinute;
    deployment.rateLimitPerDay = rateLimitPerDay;
    deployment.allowedOrigins = allowedOrigins;
    deployment.createdBy = createdBy;
    deployment.createdAt = OffsetDateTime.now();
    deployment.updatedAt = deployment.createdAt;
    return deployment;
  }

  public void update(
      String name,
      DeploymentChannelType channelType,
      String deploymentSlug,
      DeploymentStatus status,
      String apiKey,
      String welcomeMessage,
      Integer rateLimitPerMinute,
      Integer rateLimitPerDay,
      String allowedOrigins) {
    this.name = name;
    this.channelType = channelType;
    this.deploymentSlug = deploymentSlug;
    this.status = status;
    this.apiKey = apiKey;
    this.welcomeMessage = welcomeMessage;
    this.rateLimitPerMinute = rateLimitPerMinute;
    this.rateLimitPerDay = rateLimitPerDay;
    this.allowedOrigins = allowedOrigins;
    updatedAt = OffsetDateTime.now();
  }

  /** Rota el identificador público (p. ej. si se filtró el que estaba en uso). */
  public void regeneratePublicId() {
    publicId = generatePublicId();
    updatedAt = OffsetDateTime.now();
  }

  private static String generatePublicId() {
    byte[] bytes = new byte[16];
    RANDOM.nextBytes(bytes);
    return HexFormat.of().formatHex(bytes);
  }

  public UUID getId() { return id; }
  public UUID getTenantId() { return tenantId; }
  public UUID getAgentId() { return agentId; }
  public String getPublicId() { return publicId; }
  public String getName() { return name; }
  public DeploymentChannelType getChannelType() { return channelType; }
  public String getDeploymentSlug() { return deploymentSlug; }
  public DeploymentStatus getStatus() { return status; }
  public String getApiKey() { return apiKey; }
  public String getWelcomeMessage() { return welcomeMessage; }
  public Integer getRateLimitPerMinute() { return rateLimitPerMinute; }
  public Integer getRateLimitPerDay() { return rateLimitPerDay; }
  public String getAllowedOrigins() { return allowedOrigins; }
  public UUID getCreatedBy() { return createdBy; }
  public OffsetDateTime getCreatedAt() { return createdAt; }
  public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
