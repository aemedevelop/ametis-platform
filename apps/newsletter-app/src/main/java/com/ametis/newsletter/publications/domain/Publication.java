package com.ametis.newsletter.publications.domain;

import com.ametis.newsletter.shared.TenantScopedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "publications", schema = "newsletter")
public class Publication extends TenantScopedEntity {
  @Column(name = "project_id", nullable = false)
  private UUID projectId;

  @Column(nullable = false)
  private String title;

  @Column
  private String slug;

  @Column(columnDefinition = "text")
  private String summary;

  @Column(columnDefinition = "text")
  private String content;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private PublicationStatus status = PublicationStatus.DRAFT;

  @Column(name = "scheduled_at")
  private OffsetDateTime scheduledAt;

  @Column(name = "published_at")
  private OffsetDateTime publishedAt;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private PublicationVisibility visibility = PublicationVisibility.PRIVATE;

  @Column(name = "created_from_draft_id")
  private UUID createdFromDraftId;

  public UUID getProjectId() {
    return projectId;
  }

  public void setProjectId(UUID projectId) {
    this.projectId = projectId;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getContent() {
    return content;
  }

  public void setContent(String content) {
    this.content = content;
  }

  public String getSlug() {
    return slug;
  }

  public void setSlug(String slug) {
    this.slug = slug;
  }

  public String getSummary() {
    return summary;
  }

  public void setSummary(String summary) {
    this.summary = summary;
  }

  public PublicationStatus getStatus() {
    return status;
  }

  public void setStatus(PublicationStatus status) {
    this.status = status;
  }

  public OffsetDateTime getScheduledAt() {
    return scheduledAt;
  }

  public void setScheduledAt(OffsetDateTime scheduledAt) {
    this.scheduledAt = scheduledAt;
  }

  public OffsetDateTime getPublishedAt() {
    return publishedAt;
  }

  public void setPublishedAt(OffsetDateTime publishedAt) {
    this.publishedAt = publishedAt;
  }

  public PublicationVisibility getVisibility() {
    return visibility;
  }

  public void setVisibility(PublicationVisibility visibility) {
    this.visibility = visibility;
  }

  public UUID getCreatedFromDraftId() {
    return createdFromDraftId;
  }

  public void setCreatedFromDraftId(UUID createdFromDraftId) {
    this.createdFromDraftId = createdFromDraftId;
  }
}
