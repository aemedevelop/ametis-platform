package com.ametis.newsletter.publications.domain;

import com.ametis.newsletter.shared.TenantScopedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "publication_items", schema = "newsletter")
public class PublicationItem extends TenantScopedEntity {
  @Column(name = "publication_id", nullable = false)
  private UUID publicationId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private PublicationItemType type;

  @Column(nullable = false)
  private String title;

  @Column(columnDefinition = "text")
  private String content;

  @Column(name = "order_index", nullable = false)
  private int orderIndex;

  public UUID getPublicationId() {
    return publicationId;
  }

  public void setPublicationId(UUID publicationId) {
    this.publicationId = publicationId;
  }

  public PublicationItemType getType() {
    return type;
  }

  public void setType(PublicationItemType type) {
    this.type = type;
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

  public int getOrderIndex() {
    return orderIndex;
  }

  public void setOrderIndex(int orderIndex) {
    this.orderIndex = orderIndex;
  }
}