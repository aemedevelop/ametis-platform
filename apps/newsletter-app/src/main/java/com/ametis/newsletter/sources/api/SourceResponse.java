package com.ametis.newsletter.sources.api;

import com.ametis.newsletter.sources.domain.Source;
import com.ametis.newsletter.sources.domain.SourceType;
import java.time.OffsetDateTime;
import java.util.UUID;

public record SourceResponse(
    UUID id,
    UUID tenantId,
    UUID projectId,
    String name,
    SourceType type,
    String url,
    String category,
    boolean active,
    OffsetDateTime deletedAt,
    UUID deletedBy,
    OffsetDateTime createdAt
) {
  public static SourceResponse from(Source source) {
    return new SourceResponse(
        source.getId(),
        source.getTenantId(),
        source.getProjectId(),
        source.getName(),
        source.getType(),
        source.getUrl(),
        source.getCategory(),
        source.isActive(),
        source.getDeletedAt(),
        source.getDeletedBy(),
        source.getCreatedAt()
    );
  }
}
