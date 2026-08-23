package com.ametis.agentfactory.deployments;

import com.ametis.agentfactory.agents.AgentDefinition;
import java.time.OffsetDateTime;
import java.util.UUID;

public record DeploymentResponse(
    UUID id,
    UUID agentId,
    String agentName,
    String name,
    DeploymentChannelType channelType,
    String deploymentSlug,
    DeploymentStatus status,
    String publicUrl,
    boolean hasApiKey,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {
  public static DeploymentResponse from(AgentDeployment deployment, AgentDefinition agent) {
    return new DeploymentResponse(
        deployment.getId(),
        deployment.getAgentId(),
        agent == null ? "" : agent.getName(),
        deployment.getName(),
        deployment.getChannelType(),
        deployment.getDeploymentSlug(),
        deployment.getStatus(),
        deployment.getPublicUrl(),
        deployment.getApiKey() != null && !deployment.getApiKey().isBlank(),
        deployment.getCreatedAt(),
        deployment.getUpdatedAt());
  }
}
