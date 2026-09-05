package com.ametis.agentfactory.deployments;

import com.ametis.agentfactory.agents.AgentDefinition;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record DeploymentResponse(
    UUID id,
    UUID agentId,
    String agentName,
    String name,
    DeploymentChannelType channelType,
    String deploymentSlug,
    DeploymentStatus status,
    String publicId,
    String endpointUrl,
    String queryUrl,
    String embedSnippet,
    boolean hasApiKey,
    String welcomeMessage,
    Integer rateLimitPerMinute,
    Integer rateLimitPerDay,
    List<String> allowedOrigins,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {

  public static DeploymentResponse from(
      AgentDeployment deployment,
      AgentDefinition agent,
      DeploymentEndpoints.DeploymentEndpointInfo endpoints) {
    return new DeploymentResponse(
        deployment.getId(),
        deployment.getAgentId(),
        agent == null ? "" : agent.getName(),
        deployment.getName(),
        deployment.getChannelType(),
        deployment.getDeploymentSlug(),
        deployment.getStatus(),
        endpoints.publicId(),
        endpoints.endpointUrl(),
        endpoints.queryUrl(),
        endpoints.embedSnippet(),
        deployment.getApiKey() != null && !deployment.getApiKey().isBlank(),
        deployment.getWelcomeMessage(),
        deployment.getRateLimitPerMinute(),
        deployment.getRateLimitPerDay(),
        DeploymentOrigins.parse(deployment.getAllowedOrigins()),
        deployment.getCreatedAt(),
        deployment.getUpdatedAt());
  }
}
