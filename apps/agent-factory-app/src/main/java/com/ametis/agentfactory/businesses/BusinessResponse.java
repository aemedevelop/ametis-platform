package com.ametis.agentfactory.businesses;

import java.time.OffsetDateTime;
import java.util.UUID;

public record BusinessResponse(
    UUID id,
    String name,
    String slug,
    String description,
    BusinessStatus status,
    BusinessRepositoryStatus repositoryStatus,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {

  static BusinessResponse from(Business business) {
    return new BusinessResponse(
        business.getId(),
        business.getName(),
        business.getSlug(),
        business.getDescription(),
        business.getStatus(),
        business.getRepositoryStatus(),
        business.getCreatedAt(),
        business.getUpdatedAt());
  }
}
