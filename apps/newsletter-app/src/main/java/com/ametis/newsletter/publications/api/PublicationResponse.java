package com.ametis.newsletter.publications.api;

import com.ametis.newsletter.publications.domain.Publication;
import com.ametis.newsletter.publications.domain.PublicationStatus;
import com.ametis.newsletter.publications.domain.PublicationVisibility;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PublicationResponse(
    UUID id,
    UUID tenantId,
    UUID projectId,
    String title,
    String slug,
    String summary,
    String content,
    PublicationStatus status,
    PublicationVisibility visibility,
    OffsetDateTime scheduledAt,
    OffsetDateTime publishedAt,
    UUID createdFromDraftId,
    OffsetDateTime createdAt
) {
  public static PublicationResponse from(Publication publication) {
    return new PublicationResponse(
        publication.getId(),
        publication.getTenantId(),
        publication.getProjectId(),
        publication.getTitle(),
        publication.getSlug(),
        publication.getSummary(),
        publication.getContent(),
        publication.getStatus(),
        publication.getVisibility(),
        publication.getScheduledAt(),
        publication.getPublishedAt(),
        publication.getCreatedFromDraftId(),
        publication.getCreatedAt()
    );
  }
}
