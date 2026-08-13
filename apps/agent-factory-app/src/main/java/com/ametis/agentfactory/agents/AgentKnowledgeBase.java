package com.ametis.agentfactory.agents;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "agent_knowledge_bases")
public class AgentKnowledgeBase {
  @Id
  private UUID id;

  @Column(nullable = false)
  private UUID tenantId;

  @Column(nullable = false)
  private UUID agentId;

  @Column(nullable = false)
  private UUID knowledgeBaseId;

  @Column(nullable = false)
  private OffsetDateTime createdAt;

  protected AgentKnowledgeBase() {}

  public static AgentKnowledgeBase link(UUID tenantId, UUID agentId, UUID knowledgeBaseId) {
    AgentKnowledgeBase link = new AgentKnowledgeBase();
    link.id = UUID.randomUUID();
    link.tenantId = tenantId;
    link.agentId = agentId;
    link.knowledgeBaseId = knowledgeBaseId;
    link.createdAt = OffsetDateTime.now();
    return link;
  }

  public UUID getId() { return id; }
  public UUID getTenantId() { return tenantId; }
  public UUID getAgentId() { return agentId; }
  public UUID getKnowledgeBaseId() { return knowledgeBaseId; }
  public OffsetDateTime getCreatedAt() { return createdAt; }
}
