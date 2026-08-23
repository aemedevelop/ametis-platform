package com.ametis.agentfactory.deployments;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "agent_deployments")
public class AgentDeployment {
  @Id
  private UUID id;

  @Column(nullable = false)
  private UUID tenantId;

  @Column(nullable = false)
  private UUID agentId;

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

  @Column(length = 500)
  private String publicUrl;

  @Column(length = 120)
  private String apiKey;

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
      String publicUrl,
      String apiKey,
      UUID createdBy) {
    AgentDeployment deployment = new AgentDeployment();
    deployment.id = UUID.randomUUID();
    deployment.tenantId = tenantId;
    deployment.agentId = agentId;
    deployment.name = name;
    deployment.channelType = channelType;
    deployment.deploymentSlug = deploymentSlug;
    deployment.status = DeploymentStatus.ACTIVE;
    deployment.publicUrl = publicUrl;
    deployment.apiKey = apiKey;
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
      String publicUrl,
      String apiKey) {
    this.name = name;
    this.channelType = channelType;
    this.deploymentSlug = deploymentSlug;
    this.status = status;
    this.publicUrl = publicUrl;
    this.apiKey = apiKey;
    updatedAt = OffsetDateTime.now();
  }

  public UUID getId() { return id; }
  public UUID getTenantId() { return tenantId; }
  public UUID getAgentId() { return agentId; }
  public String getName() { return name; }
  public DeploymentChannelType getChannelType() { return channelType; }
  public String getDeploymentSlug() { return deploymentSlug; }
  public DeploymentStatus getStatus() { return status; }
  public String getPublicUrl() { return publicUrl; }
  public String getApiKey() { return apiKey; }
  public UUID getCreatedBy() { return createdBy; }
  public OffsetDateTime getCreatedAt() { return createdAt; }
  public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
