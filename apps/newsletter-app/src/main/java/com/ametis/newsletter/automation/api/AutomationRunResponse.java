package com.ametis.newsletter.automation.api;

import com.ametis.newsletter.automation.domain.AutomationRun;
import com.ametis.newsletter.automation.domain.AutomationRunStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AutomationRunResponse(
    UUID id,
    UUID tenantId,
    UUID projectId,
    String triggerType,
    OffsetDateTime startedAt,
    OffsetDateTime finishedAt,
    AutomationRunStatus status,
    String externalExecutionId,
    String logsSummary
) {
  public static AutomationRunResponse from(AutomationRun run) {
    return new AutomationRunResponse(
        run.getId(),
        run.getTenantId(),
        run.getProjectId(),
        run.getTriggerType(),
        run.getStartedAt(),
        run.getFinishedAt(),
        run.getStatus(),
        run.getExternalExecutionId(),
        run.getLogsSummary());
  }
}
