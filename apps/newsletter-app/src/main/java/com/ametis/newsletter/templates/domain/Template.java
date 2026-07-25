package com.ametis.newsletter.templates.domain;

import com.ametis.newsletter.shared.TenantScopedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "templates", schema = "newsletter")
public class Template extends TenantScopedEntity {
  @Column(name = "project_id", nullable = false)
  private UUID projectId;

  @Column(nullable = false)
  private String name;

  @Column(columnDefinition = "jsonb", nullable = false)
  private String structure;

  @Column(name = "style_config", columnDefinition = "jsonb", nullable = false)
  private String styleConfig;

  @Column(name = "is_default", nullable = false)
  private boolean defaultTemplate = false;

  public UUID getProjectId() {
    return projectId;
  }

  public void setProjectId(UUID projectId) {
    this.projectId = projectId;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getStructure() {
    return structure;
  }

  public void setStructure(String structure) {
    this.structure = structure;
  }

  public String getStyleConfig() {
    return styleConfig;
  }

  public void setStyleConfig(String styleConfig) {
    this.styleConfig = styleConfig;
  }

  public boolean isDefaultTemplate() {
    return defaultTemplate;
  }

  public void setDefaultTemplate(boolean defaultTemplate) {
    this.defaultTemplate = defaultTemplate;
  }
}