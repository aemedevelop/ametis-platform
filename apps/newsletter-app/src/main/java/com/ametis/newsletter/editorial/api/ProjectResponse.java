package com.ametis.newsletter.editorial.api;

import com.ametis.newsletter.editorial.domain.NewsletterProject;
import com.ametis.newsletter.editorial.domain.ProjectStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ProjectResponse(
    UUID id,
    UUID tenantId,
    String name,
    String description,
    String language,
    String tone,
    String audience,
    ProjectStatus status,
    OffsetDateTime createdAt,
    OffsetDateTime deletedAt,
    UUID deletedBy
) {
  public static ProjectResponse from(NewsletterProject project) {
    return new ProjectResponse(
        project.getId(),
        project.getTenantId(),
        project.getName(),
        project.getDescription(),
        project.getLanguage(),
        project.getTone(),
        project.getAudience(),
        project.getStatus(),
        project.getCreatedAt(),
        project.getDeletedAt(),
        project.getDeletedBy()
    );
  }
}
