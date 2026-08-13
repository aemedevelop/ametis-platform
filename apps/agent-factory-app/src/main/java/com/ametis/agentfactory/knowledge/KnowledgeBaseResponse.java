package com.ametis.agentfactory.knowledge;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record KnowledgeBaseResponse(
    UUID id,
    String name,
    String description,
    KnowledgeBaseStatus status,
    int documentCount,
    List<String> documentNames,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {
  static KnowledgeBaseResponse from(KnowledgeBase base, List<String> documentNames) {
    return new KnowledgeBaseResponse(
        base.getId(),
        base.getName(),
        base.getDescription(),
        base.getStatus(),
        documentNames.size(),
        documentNames,
        base.getCreatedAt(),
        base.getUpdatedAt());
  }
}
