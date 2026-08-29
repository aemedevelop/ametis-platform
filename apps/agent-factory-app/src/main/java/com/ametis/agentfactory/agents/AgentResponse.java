package com.ametis.agentfactory.agents;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record AgentResponse(
    UUID id,
    String name,
    String description,
    String persona,
    String targetAudience,
    String tone,
    String responseLanguage,
    String instructions,
    AgentStatus status,
    int knowledgeBaseCount,
    List<UUID> knowledgeBaseIds,
    List<String> knowledgeBaseNames,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt,
    OffsetDateTime publishedAt) {
  static AgentResponse from(AgentDefinition agent, List<String> knowledgeBaseNames) {
    return from(agent, null, List.of(), knowledgeBaseNames);
  }

  static AgentResponse from(
      AgentDefinition agent,
      AgentContextProfile profile,
      List<UUID> knowledgeBaseIds,
      List<String> knowledgeBaseNames) {
    return new AgentResponse(
        agent.getId(),
        agent.getName(),
        agent.getDescription(),
        profile == null ? null : profile.getPersona(),
        profile == null ? null : profile.getTargetAudience(),
        profile == null ? null : profile.getTone(),
        profile == null ? null : profile.getResponseLanguage(),
        agent.getInstructions(),
        agent.getStatus(),
        knowledgeBaseNames.size(),
        knowledgeBaseIds,
        knowledgeBaseNames,
        agent.getCreatedAt(),
        agent.getUpdatedAt(),
        agent.getPublishedAt());
  }
}
