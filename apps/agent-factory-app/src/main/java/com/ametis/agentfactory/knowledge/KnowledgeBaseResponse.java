package com.ametis.agentfactory.knowledge;

import com.ametis.agentfactory.businesses.BusinessRepositoryStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record KnowledgeBaseResponse(
    UUID id,
    UUID businessId,
    String name,
    String description,
    KnowledgeBaseStatus status,
    BusinessRepositoryStatus repositoryStatus,
    long documentCount,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {

  static KnowledgeBaseResponse from(KnowledgeBase base, long documentCount) {
    return new KnowledgeBaseResponse(
        base.getId(),
        base.getBusinessId(),
        base.getName(),
        base.getDescription(),
        base.getStatus(),
        base.getRepositoryStatus(),
        documentCount,
        base.getCreatedAt(),
        base.getUpdatedAt());
  }
}
