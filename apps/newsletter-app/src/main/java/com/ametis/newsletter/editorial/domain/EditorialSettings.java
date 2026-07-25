package com.ametis.newsletter.editorial.domain;

import com.ametis.newsletter.shared.TenantScopedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "editorial_settings", schema = "newsletter")
public class EditorialSettings extends TenantScopedEntity {
  @Column(name = "project_id", nullable = false)
  private UUID projectId;

  @Column(nullable = false)
  private String tone;

  @Column(name = "writing_style", nullable = false)
  private String writingStyle;

  @Column(name = "preferred_topic")
  private String preferredTopic;

  @Column(name = "article_length")
  private String articleLength;

  @Column(nullable = false)
  private String audience;

  @Column(name = "include_summary", nullable = false)
  private boolean includeSummary = true;

  @Column(name = "include_cta", nullable = false)
  private boolean includeCta = true;

  public UUID getProjectId() {
    return projectId;
  }

  public void setProjectId(UUID projectId) {
    this.projectId = projectId;
  }

  public String getTone() {
    return tone;
  }

  public void setTone(String tone) {
    this.tone = tone;
  }

  public String getWritingStyle() {
    return writingStyle;
  }

  public void setWritingStyle(String writingStyle) {
    this.writingStyle = writingStyle;
  }

  public String getPreferredTopic() {
    return preferredTopic;
  }

  public void setPreferredTopic(String preferredTopic) {
    this.preferredTopic = preferredTopic;
  }

  public String getArticleLength() {
    return articleLength;
  }

  public void setArticleLength(String articleLength) {
    this.articleLength = articleLength;
  }

  public String getAudience() {
    return audience;
  }

  public void setAudience(String audience) {
    this.audience = audience;
  }

  public boolean isIncludeSummary() {
    return includeSummary;
  }

  public void setIncludeSummary(boolean includeSummary) {
    this.includeSummary = includeSummary;
  }

  public boolean isIncludeCta() {
    return includeCta;
  }

  public void setIncludeCta(boolean includeCta) {
    this.includeCta = includeCta;
  }
}
