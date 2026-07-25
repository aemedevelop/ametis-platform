package com.ametis.newsletter.automation.domain;

import com.ametis.newsletter.shared.TenantScopedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "automation_runs", schema = "newsletter")
public class AutomationRun extends TenantScopedEntity {
  @Column(name = "project_id", nullable = false)
  private UUID projectId;

  @Column(name = "trigger_type", nullable = false)
  private String triggerType;

  @Column(name = "started_at", nullable = false)
  private OffsetDateTime startedAt = OffsetDateTime.now();

  @Column(name = "finished_at")
  private OffsetDateTime finishedAt;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private AutomationRunStatus status = AutomationRunStatus.REQUESTED;

  @Column(name = "external_execution_id")
  private String externalExecutionId;

  @Column(name = "logs_summary", columnDefinition = "text")
  private String logsSummary;

  public UUID getProjectId() {
    return projectId;
  }

  public void setProjectId(UUID projectId) {
    this.projectId = projectId;
  }

  public String getTriggerType() {
    return triggerType;
  }

  public void setTriggerType(String triggerType) {
    this.triggerType = triggerType;
  }

  public OffsetDateTime getStartedAt() {
    return startedAt;
  }

  public void setStartedAt(OffsetDateTime startedAt) {
    this.startedAt = startedAt;
  }

  public OffsetDateTime getFinishedAt() {
    return finishedAt;
  }

  public void setFinishedAt(OffsetDateTime finishedAt) {
    this.finishedAt = finishedAt;
  }

  public AutomationRunStatus getStatus() {
    return status;
  }

  public void setStatus(AutomationRunStatus status) {
    this.status = status;
  }

  public String getExternalExecutionId() {
    return externalExecutionId;
  }

  public void setExternalExecutionId(String externalExecutionId) {
    this.externalExecutionId = externalExecutionId;
  }

  public String getLogsSummary() {
    return logsSummary;
  }

  public void setLogsSummary(String logsSummary) {
    this.logsSummary = logsSummary;
  }
}
