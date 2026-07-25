package com.ametis.newsletter.editorial.api;

import com.ametis.newsletter.editorial.domain.EditorialSettings;
import java.util.UUID;

public record EditorialSettingsResponse(
    UUID id,
    UUID tenantId,
    UUID projectId,
    String preferredTopic,
    String writingStyle,
    String tone,
    String articleLength,
    String audience,
    boolean includeSummary,
    boolean includeCta
) {
  public static EditorialSettingsResponse from(EditorialSettings settings) {
    return new EditorialSettingsResponse(
        settings.getId(),
        settings.getTenantId(),
        settings.getProjectId(),
        settings.getPreferredTopic(),
        settings.getWritingStyle(),
        settings.getTone(),
        settings.getArticleLength(),
        settings.getAudience(),
        settings.isIncludeSummary(),
        settings.isIncludeCta());
  }
}
