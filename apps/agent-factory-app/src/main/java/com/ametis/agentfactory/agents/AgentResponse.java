package com.ametis.agentfactory.agents;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record AgentResponse(
    UUID id,
    String name,
    String description,
    String instructions,
    AgentStatus status,
    int knowledgeBaseCount,
    List<String> knowledgeBaseNames,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt,
    OffsetDateTime publishedAt) {
  static AgentResponse from(AgentDefinition agent, List<String> knowledgeBaseNames) {
    return new AgentResponse(
        agent.getId(),
        agent.getName(),
        agent.getDescription(),
        agent.getInstructions(),
        agent.getStatus(),
        knowledgeBaseNames.size(),
        knowledgeBaseNames,
        agent.getCreatedAt(),
        agent.getUpdatedAt(),
        agent.getPublishedAt());
  }
}
