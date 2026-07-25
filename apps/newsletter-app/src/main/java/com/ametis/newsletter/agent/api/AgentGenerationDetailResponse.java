package com.ametis.newsletter.agent.api;

import com.ametis.newsletter.agent.domain.GenerationRequest;
import com.ametis.newsletter.agent.domain.GenerationRequestStatus;
import com.ametis.newsletter.drafts.api.DraftResponse;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record AgentGenerationDetailResponse(
    UUID id,
    UUID tenantId,
    UUID projectId,
    String titleHint,
    String topicHint,
    String roleProfile,
    String writingStyle,
    String audience,
    String language,
    String length,
    String structureType,
    String callToAction,
    String creativityLevel,
    boolean useReferences,
    boolean includeSummary,
    boolean includeConclusions,
    boolean includeTags,
    Integer maxSources,
    GenerationRequestStatus status,
    UUID createdBy,
    String externalExecutionId,
    List<UUID> sourceIds,
    DraftResponse draft,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
  public static AgentGenerationDetailResponse from(
      GenerationRequest request,
      List<UUID> sourceIds,
      DraftResponse draft
  ) {
    return new AgentGenerationDetailResponse(
        request.getId(),
        request.getTenantId(),
        request.getProjectId(),
        request.getTitleHint(),
        request.getTopicHint(),
        request.getRoleProfile(),
        request.getWritingStyle(),
        request.getAudience(),
        request.getLanguage(),
        request.getLength(),
        request.getStructureType(),
        request.getCallToAction(),
        request.getCreativityLevel(),
        request.isUseReferences(),
        request.isIncludeSummary(),
        request.isIncludeConclusions(),
        request.isIncludeTags(),
        request.getMaxSources(),
        request.getStatus(),
        request.getCreatedBy(),
        request.getExternalExecutionId(),
        sourceIds,
        draft,
        request.getCreatedAt(),
        request.getUpdatedAt());
  }
}
