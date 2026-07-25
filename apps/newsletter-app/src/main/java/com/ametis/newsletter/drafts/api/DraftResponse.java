package com.ametis.newsletter.drafts.api;

import com.ametis.newsletter.drafts.domain.Draft;
import com.ametis.newsletter.drafts.domain.DraftStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record DraftResponse(
    UUID id,
    UUID tenantId,
    UUID projectId,
    UUID generationRequestId,
    String proposedTopic,
    String generatedTitle,
    String generatedSummary,
    String generatedContent,
    DraftStatus status,
    String generationSource,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
  public static DraftResponse from(Draft draft) {
    return new DraftResponse(
        draft.getId(),
        draft.getTenantId(),
        draft.getProjectId(),
        draft.getGenerationRequestId(),
        draft.getProposedTopic(),
        draft.getGeneratedTitle(),
        draft.getGeneratedSummary(),
        draft.getGeneratedContent(),
        draft.getStatus(),
        draft.getGenerationSource(),
        draft.getCreatedAt(),
        draft.getUpdatedAt());
  }
}
