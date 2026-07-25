package com.ametis.newsletter.agent.api;

import jakarta.validation.constraints.Min;
import java.util.List;
import java.util.UUID;

public record AgentGenerationCreateRequest(
    List<UUID> sourceIds,
    Boolean useAllActiveSources,
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
    Boolean useReferences,
    Boolean includeSummary,
    Boolean includeConclusions,
    Boolean includeTags,
    @Min(1) Integer maxSources
) {
}
