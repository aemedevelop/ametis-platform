package com.ametis.agentfactory.agents;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "agents")
public class AgentDefinition {
  @Id
  private UUID id;

  @Column(nullable = false)
  private UUID tenantId;

  @Column(nullable = false, updatable = false)
  private UUID businessId;

  @Column(nullable = false, length = 80)
  private String name;

  @Column(length = 500)
  private String description;

  @Column(length = 900)
  private String instructions;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private AgentStatus status;

  private UUID createdBy;

  @Column(nullable = false)
  private OffsetDateTime createdAt;

  @Column(nullable = false)
  private OffsetDateTime updatedAt;

  private OffsetDateTime publishedAt;

  protected AgentDefinition() {}

  public static AgentDefinition create(
      UUID tenantId,
      UUID businessId,
      String name,
      String description,
      String instructions,
      UUID createdBy) {
    AgentDefinition agent = new AgentDefinition();
    agent.id = UUID.randomUUID();
    agent.tenantId = tenantId;
    agent.businessId = businessId;
    agent.name = name;
    agent.description = description;
    agent.instructions = instructions;
    agent.status = AgentStatus.DRAFT;
    agent.createdBy = createdBy;
    agent.createdAt = OffsetDateTime.now();
    agent.updatedAt = agent.createdAt;
    return agent;
  }

  public void update(
      String name,
      String description,
      String instructions) {
    this.name = name;
    this.description = description;
    this.instructions = instructions;
    status = AgentStatus.DRAFT;
    publishedAt = null;
    updatedAt = OffsetDateTime.now();
  }

  public void publish() {
    status = AgentStatus.READY;
    publishedAt = OffsetDateTime.now();
    updatedAt = publishedAt;
  }

  public UUID getId() { return id; }
  public UUID getTenantId() { return tenantId; }
  public UUID getBusinessId() { return businessId; }
  public String getName() { return name; }
  public String getDescription() { return description; }
  public String getInstructions() { return instructions; }
  public AgentStatus getStatus() { return status; }
  public UUID getCreatedBy() { return createdBy; }
  public OffsetDateTime getCreatedAt() { return createdAt; }
  public OffsetDateTime getUpdatedAt() { return updatedAt; }
  public OffsetDateTime getPublishedAt() { return publishedAt; }
}
