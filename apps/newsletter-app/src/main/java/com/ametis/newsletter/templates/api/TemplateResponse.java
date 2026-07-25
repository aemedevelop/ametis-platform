package com.ametis.newsletter.templates.api;

import com.ametis.newsletter.templates.domain.Template;
import java.time.OffsetDateTime;
import java.util.UUID;

public record TemplateResponse(
    UUID id,
    UUID tenantId,
    UUID projectId,
    String name,
    String structure,
    String styleConfig,
    boolean isDefault,
    OffsetDateTime createdAt
) {
  public static TemplateResponse from(Template template) {
    return new TemplateResponse(
        template.getId(),
        template.getTenantId(),
        template.getProjectId(),
        template.getName(),
        template.getStructure(),
        template.getStyleConfig(),
        template.isDefaultTemplate(),
        template.getCreatedAt()
    );
  }
}