package com.ametis.newsletter.sources.domain;

import com.ametis.newsletter.shared.TenantScopedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "sources", schema = "newsletter")
public class Source extends TenantScopedEntity {
  @Column(nullable = false)
  private String name;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private SourceType type;

  @Column(name = "project_id")
  private UUID projectId;

  @Column(nullable = false)
  private String url;

  @Column
  private String category;

  @Column(name = "is_active", nullable = false)
  private boolean active = true;

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

  public SourceType getType() {
    return type;
  }

  public void setType(SourceType type) {
    this.type = type;
  }

  public String getUrl() {
    return url;
  }

  public void setUrl(String url) {
    this.url = url;
  }

  public UUID getProjectId() {
    return projectId;
  }

  public void setProjectId(UUID projectId) {
    this.projectId = projectId;
  }

  public String getCategory() {
    return category;
  }

  public void setCategory(String category) {
    this.category = category;
  }

  public boolean isActive() {
    return active;
  }

  public void setActive(boolean active) {
    this.active = active;
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
