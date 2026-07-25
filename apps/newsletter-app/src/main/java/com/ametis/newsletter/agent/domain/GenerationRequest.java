package com.ametis.newsletter.agent.domain;

import com.ametis.newsletter.shared.TenantScopedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "generation_requests", schema = "newsletter")
public class GenerationRequest extends TenantScopedEntity {
  @Column(name = "project_id", nullable = false)
  private UUID projectId;

  @Column(name = "title_hint")
  private String titleHint;

  @Column(name = "topic_hint")
  private String topicHint;

  @Column(name = "role_profile", nullable = false)
  private String roleProfile;

  @Column(name = "writing_style", nullable = false)
  private String writingStyle;

  @Column(nullable = false)
  private String audience;

  @Column(nullable = false)
  private String language;

  @Column(name = "content_length", nullable = false)
  private String length;

  @Column(name = "structure_type", nullable = false)
  private String structureType;

  @Column(name = "call_to_action")
  private String callToAction;

  @Column(name = "creativity_level", nullable = false)
  private String creativityLevel;

  @Column(name = "use_references", nullable = false)
  private boolean useReferences;

  @Column(name = "include_summary", nullable = false)
  private boolean includeSummary = true;

  @Column(name = "include_conclusions", nullable = false)
  private boolean includeConclusions = true;

  @Column(name = "include_tags", nullable = false)
  private boolean includeTags;

  @Column(name = "max_sources")
  private Integer maxSources;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private GenerationRequestStatus status = GenerationRequestStatus.REQUESTED;

  @Column(name = "created_by")
  private UUID createdBy;

  @Column(name = "external_execution_id")
  private String externalExecutionId;

  public UUID getProjectId() {
    return projectId;
  }

  public void setProjectId(UUID projectId) {
    this.projectId = projectId;
  }

  public String getTitleHint() {
    return titleHint;
  }

  public void setTitleHint(String titleHint) {
    this.titleHint = titleHint;
  }

  public String getTopicHint() {
    return topicHint;
  }

  public void setTopicHint(String topicHint) {
    this.topicHint = topicHint;
  }

  public String getRoleProfile() {
    return roleProfile;
  }

  public void setRoleProfile(String roleProfile) {
    this.roleProfile = roleProfile;
  }

  public String getWritingStyle() {
    return writingStyle;
  }

  public void setWritingStyle(String writingStyle) {
    this.writingStyle = writingStyle;
  }

  public String getAudience() {
    return audience;
  }

  public void setAudience(String audience) {
    this.audience = audience;
  }

  public String getLanguage() {
    return language;
  }

  public void setLanguage(String language) {
    this.language = language;
  }

  public String getLength() {
    return length;
  }

  public void setLength(String length) {
    this.length = length;
  }

  public String getStructureType() {
    return structureType;
  }

  public void setStructureType(String structureType) {
    this.structureType = structureType;
  }

  public String getCallToAction() {
    return callToAction;
  }

  public void setCallToAction(String callToAction) {
    this.callToAction = callToAction;
  }

  public String getCreativityLevel() {
    return creativityLevel;
  }

  public void setCreativityLevel(String creativityLevel) {
    this.creativityLevel = creativityLevel;
  }

  public boolean isUseReferences() {
    return useReferences;
  }

  public void setUseReferences(boolean useReferences) {
    this.useReferences = useReferences;
  }

  public boolean isIncludeSummary() {
    return includeSummary;
  }

  public void setIncludeSummary(boolean includeSummary) {
    this.includeSummary = includeSummary;
  }

  public boolean isIncludeConclusions() {
    return includeConclusions;
  }

  public void setIncludeConclusions(boolean includeConclusions) {
    this.includeConclusions = includeConclusions;
  }

  public boolean isIncludeTags() {
    return includeTags;
  }

  public void setIncludeTags(boolean includeTags) {
    this.includeTags = includeTags;
  }

  public Integer getMaxSources() {
    return maxSources;
  }

  public void setMaxSources(Integer maxSources) {
    this.maxSources = maxSources;
  }

  public GenerationRequestStatus getStatus() {
    return status;
  }

  public void setStatus(GenerationRequestStatus status) {
    this.status = status;
  }

  public UUID getCreatedBy() {
    return createdBy;
  }

  public void setCreatedBy(UUID createdBy) {
    this.createdBy = createdBy;
  }

  public String getExternalExecutionId() {
    return externalExecutionId;
  }

  public void setExternalExecutionId(String externalExecutionId) {
    this.externalExecutionId = externalExecutionId;
  }
}
