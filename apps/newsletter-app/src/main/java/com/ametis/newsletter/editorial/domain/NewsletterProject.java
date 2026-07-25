package com.ametis.newsletter.editorial.domain;

import com.ametis.newsletter.shared.TenantScopedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "projects", schema = "newsletter")
public class NewsletterProject extends TenantScopedEntity {
  @Column(nullable = false)
  private String name;

  @Column(columnDefinition = "text")
  private String description;

  @Column(nullable = false)
  private String language;

  @Column(nullable = false)
  private String tone;

  @Column
  private String audience;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ProjectStatus status = ProjectStatus.DRAFT;

  @Column(name = "deleted_at")
  private OffsetDateTime deletedAt;

  @Column(name = "deleted_by")
  private UUID deletedBy;

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public String getLanguage() {
    return language;
  }

  public void setLanguage(String language) {
    this.language = language;
  }

  public String getTone() {
    return tone;
  }

  public void setTone(String tone) {
    this.tone = tone;
  }

  public String getAudience() {
    return audience;
  }

  public void setAudience(String audience) {
    this.audience = audience;
  }

  public ProjectStatus getStatus() {
    return status;
  }

  public void setStatus(ProjectStatus status) {
    this.status = status;
  }

  public OffsetDateTime getDeletedAt() {
    return deletedAt;
  }

  public void setDeletedAt(OffsetDateTime deletedAt) {
    this.deletedAt = deletedAt;
  }

  public UUID getDeletedBy() {
    return deletedBy;
  }

  public void setDeletedBy(UUID deletedBy) {
    this.deletedBy = deletedBy;
  }
}
