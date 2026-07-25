package com.ametis.newsletter.drafts.api;

import com.ametis.newsletter.drafts.domain.DraftStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;

public record DraftRequest(
    String proposedTopic,
    @NotBlank String generatedTitle,
    String generatedSummary,
    String generatedContent,
    @NotNull DraftStatus status,
    String generationSource,
    OffsetDateTime scheduledAt
) {
}
