package com.ametis.newsletter.viewer.api;

import com.ametis.newsletter.publications.domain.Publication;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ViewerPublicationResponse(
    UUID id,
    UUID projectId,
    String title,
    String slug,
    String summary,
    String content,
    OffsetDateTime publishedAt
) {
  public static ViewerPublicationResponse from(Publication publication) {
    return new ViewerPublicationResponse(
        publication.getId(),
        publication.getProjectId(),
        publication.getTitle(),
        publication.getSlug(),
        publication.getSummary(),
        publication.getContent(),
        publication.getPublishedAt());
  }
}
