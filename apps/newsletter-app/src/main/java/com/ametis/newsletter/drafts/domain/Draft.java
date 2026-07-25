package com.ametis.newsletter.drafts.domain;

import com.ametis.newsletter.shared.TenantScopedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "drafts", schema = "newsletter")
public class Draft extends TenantScopedEntity {
  @Column(name = "project_id", nullable = false)
  private UUID projectId;

  @Column(name = "generation_request_id")
  private UUID generationRequestId;

  @Column(name = "proposed_topic")
  private String proposedTopic;

  @Column(name = "generated_title")
  private String generatedTitle;

  @Column(name = "generated_summary", columnDefinition = "text")
  private String generatedSummary;

  @Column(name = "generated_content", columnDefinition = "text")
  private String generatedContent;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private DraftStatus status = DraftStatus.GENERATED;

  @Column(name = "generation_source")
  private String generationSource;

  public UUID getProjectId() {
    return projectId;
  }

  public void setProjectId(UUID projectId) {
    this.projectId = projectId;
  }

  public UUID getGenerationRequestId() {
    return generationRequestId;
  }

  public void setGenerationRequestId(UUID generationRequestId) {
    this.generationRequestId = generationRequestId;
  }

  public String getProposedTopic() {
    return proposedTopic;
  }

  public void setProposedTopic(String proposedTopic) {
    this.proposedTopic = proposedTopic;
  }

  public String getGeneratedTitle() {
    return generatedTitle;
  }

  public void setGeneratedTitle(String generatedTitle) {
    this.generatedTitle = generatedTitle;
  }

  public String getGeneratedSummary() {
    return generatedSummary;
  }

  public void setGeneratedSummary(String generatedSummary) {
    this.generatedSummary = generatedSummary;
  }

  public String getGeneratedContent() {
    return generatedContent;
  }

  public void setGeneratedContent(String generatedContent) {
    this.generatedContent = generatedContent;
  }

  public DraftStatus getStatus() {
    return status;
  }

  public void setStatus(DraftStatus status) {
    this.status = status;
  }

  public String getGenerationSource() {
    return generationSource;
  }

  public void setGenerationSource(String generationSource) {
    this.generationSource = generationSource;
  }
}
