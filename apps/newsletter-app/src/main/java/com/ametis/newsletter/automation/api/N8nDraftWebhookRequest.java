package com.ametis.newsletter.automation.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record N8nDraftWebhookRequest(
    @NotNull UUID tenantId,
    @NotNull UUID projectId,
    String proposedTopic,
    @NotBlank String generatedTitle,
    String generatedSummary,
    String generatedContent,
    String generationSource,
    String externalExecutionId,
    String logsSummary
) {
}
