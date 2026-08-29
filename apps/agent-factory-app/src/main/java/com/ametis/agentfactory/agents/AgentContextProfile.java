package com.ametis.agentfactory.agents;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "agent_context_profiles")
public class AgentContextProfile {
  @Id
  private UUID agentId;

  @Column(nullable = false)
  private UUID tenantId;

  @Column(length = 500)
  private String persona;

  @Column(length = 300)
  private String targetAudience;

  @Column(length = 80)
  private String tone;

  @Column(length = 32)
  private String responseLanguage;

  @Column(nullable = false)
  private OffsetDateTime updatedAt;

  protected AgentContextProfile() {}

  public static AgentContextProfile create(
      UUID tenantId,
      UUID agentId,
      String persona,
      String targetAudience,
      String tone,
      String responseLanguage) {
    AgentContextProfile profile = new AgentContextProfile();
    profile.tenantId = tenantId;
    profile.agentId = agentId;
    profile.update(persona, targetAudience, tone, responseLanguage);
    return profile;
  }

  public void update(String persona, String targetAudience, String tone, String responseLanguage) {
    this.persona = persona;
    this.targetAudience = targetAudience;
    this.tone = tone;
    this.responseLanguage = responseLanguage;
    updatedAt = OffsetDateTime.now();
  }

  public UUID getAgentId() { return agentId; }
  public UUID getTenantId() { return tenantId; }
  public String getPersona() { return persona; }
  public String getTargetAudience() { return targetAudience; }
  public String getTone() { return tone; }
  public String getResponseLanguage() { return responseLanguage; }
  public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
