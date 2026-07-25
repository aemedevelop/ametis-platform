package com.ametis.newsletter.agent.api;

import com.ametis.newsletter.agent.domain.GenerationRequest;
import com.ametis.newsletter.agent.domain.GenerationRequestStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AgentGenerationResponse(
    UUID id,
    UUID tenantId,
    UUID projectId,
    GenerationRequestStatus status,
    String externalExecutionId,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
  public static AgentGenerationResponse from(GenerationRequest generationRequest) {
    return new AgentGenerationResponse(
        generationRequest.getId(),
        generationRequest.getTenantId(),
        generationRequest.getProjectId(),
        generationRequest.getStatus(),
        generationRequest.getExternalExecutionId(),
        generationRequest.getCreatedAt(),
        generationRequest.getUpdatedAt());
  }
}
