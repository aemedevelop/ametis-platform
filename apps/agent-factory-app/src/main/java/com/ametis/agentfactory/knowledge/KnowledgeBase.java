package com.ametis.agentfactory.knowledge;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "knowledge_bases")
public class KnowledgeBase {
  @Id
  private UUID id;

  @Column(nullable = false)
  private UUID tenantId;

  @Column(nullable = false, length = 120)
  private String name;

  @Column(length = 1000)
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private KnowledgeBaseStatus status;

  private UUID createdBy;

  @Column(nullable = false)
  private OffsetDateTime createdAt;

  @Column(nullable = false)
  private OffsetDateTime updatedAt;

  protected KnowledgeBase() {}

  public static KnowledgeBase create(UUID tenantId, String name, String description, UUID createdBy) {
    KnowledgeBase base = new KnowledgeBase();
    base.id = UUID.randomUUID();
    base.tenantId = tenantId;
    base.name = name;
    base.description = description;
    base.status = KnowledgeBaseStatus.DRAFT;
    base.createdBy = createdBy;
    base.createdAt = OffsetDateTime.now();
    base.updatedAt = base.createdAt;
    return base;
  }

  public void update(String name, String description) {
    this.name = name;
    this.description = description;
    updatedAt = OffsetDateTime.now();
  }

  public UUID getId() { return id; }
  public UUID getTenantId() { return tenantId; }
  public String getName() { return name; }
  public String getDescription() { return description; }
  public KnowledgeBaseStatus getStatus() { return status; }
  public UUID getCreatedBy() { return createdBy; }
  public OffsetDateTime getCreatedAt() { return createdAt; }
  public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
