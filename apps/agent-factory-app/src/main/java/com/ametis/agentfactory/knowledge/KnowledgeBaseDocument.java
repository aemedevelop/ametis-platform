package com.ametis.agentfactory.knowledge;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "knowledge_base_documents")
public class KnowledgeBaseDocument {
  @Id
  private UUID id;

  @Column(nullable = false)
  private UUID tenantId;

  @Column(nullable = false)
  private UUID knowledgeBaseId;

  @Column(nullable = false)
  private UUID documentAssetId;

  @Column(nullable = false)
  private OffsetDateTime createdAt;

  protected KnowledgeBaseDocument() {}

  public static KnowledgeBaseDocument link(UUID tenantId, UUID knowledgeBaseId, UUID documentAssetId) {
    KnowledgeBaseDocument document = new KnowledgeBaseDocument();
    document.id = UUID.randomUUID();
    document.tenantId = tenantId;
    document.knowledgeBaseId = knowledgeBaseId;
    document.documentAssetId = documentAssetId;
    document.createdAt = OffsetDateTime.now();
    return document;
  }

  public UUID getId() { return id; }
  public UUID getTenantId() { return tenantId; }
  public UUID getKnowledgeBaseId() { return knowledgeBaseId; }
  public UUID getDocumentAssetId() { return documentAssetId; }
  public OffsetDateTime getCreatedAt() { return createdAt; }
}
