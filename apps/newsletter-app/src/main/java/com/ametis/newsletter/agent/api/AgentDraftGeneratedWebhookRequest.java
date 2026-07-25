package com.ametis.newsletter.agent.api;

import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record AgentDraftGeneratedWebhookRequest(
    @NotNull UUID generationRequestId,
    UUID tenantId,
    UUID projectId,
    String generatedTitle,
    String generatedSummary,
    String generatedContent,
    String proposedTopic,
    String generationSource,
    String externalExecutionId,
    String logsSummary,
    String status,
    List<UUID> usedSourceIds,
    String errorMessage
) {
}
