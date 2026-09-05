package com.ametis.agentfactory.documents;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "document_assets")
public class DocumentAsset {
  @Id
  private UUID id;

  @Column(nullable = false)
  private UUID tenantId;

  @Column(nullable = false, updatable = false)
  private UUID businessId;

  @Column(nullable = false, updatable = false)
  private UUID knowledgeBaseId;

  @Column(nullable = false)
  private UUID repositoryBindingId;

  @Column(unique = true, length = 160)
  private String driveFileId;

  @Column(nullable = false)
  private String originalName;

  @Column(length = 160)
  private String mimeType;

  @Column(nullable = false)
  private long sizeBytes;

  @Column(nullable = false, length = 64)
  private String sha256;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private DocumentStatus status;

  private UUID createdBy;

  @Column(nullable = false)
  private OffsetDateTime createdAt;

  @Column(nullable = false)
  private OffsetDateTime updatedAt;

  protected DocumentAsset() {}

  public static DocumentAsset uploading(
      UUID tenantId, UUID businessId, UUID knowledgeBaseId, UUID repositoryBindingId,
      String originalName, String mimeType, long sizeBytes, String sha256, UUID createdBy) {
    DocumentAsset asset = new DocumentAsset();
    asset.id = UUID.randomUUID();
    asset.tenantId = tenantId;
    asset.businessId = businessId;
    asset.knowledgeBaseId = knowledgeBaseId;
    asset.repositoryBindingId = repositoryBindingId;
    asset.originalName = originalName;
    asset.mimeType = mimeType;
    asset.sizeBytes = sizeBytes;
    asset.sha256 = sha256;
    asset.status = DocumentStatus.UPLOADING;
    asset.createdBy = createdBy;
    asset.createdAt = OffsetDateTime.now();
    asset.updatedAt = asset.createdAt;
    return asset;
  }

  public void retry(String originalName, String mimeType, long sizeBytes, UUID createdBy) {
    this.originalName = originalName;
    this.mimeType = mimeType;
    this.sizeBytes = sizeBytes;
    this.createdBy = createdBy;
    status = DocumentStatus.UPLOADING;
    updatedAt = OffsetDateTime.now();
  }

  public void stored(String driveFileId) {
    this.driveFileId = driveFileId;
    status = DocumentStatus.STORED;
    updatedAt = OffsetDateTime.now();
  }

  public void failed() {
    status = DocumentStatus.FAILED;
    updatedAt = OffsetDateTime.now();
  }

  public void deleted() {
    status = DocumentStatus.DELETED;
    updatedAt = OffsetDateTime.now();
  }

  public UUID getId() { return id; }
  public UUID getTenantId() { return tenantId; }
  public UUID getBusinessId() { return businessId; }
  public UUID getKnowledgeBaseId() { return knowledgeBaseId; }
  public UUID getRepositoryBindingId() { return repositoryBindingId; }
  public String getDriveFileId() { return driveFileId; }
  public String getOriginalName() { return originalName; }
  public String getMimeType() { return mimeType; }
  public long getSizeBytes() { return sizeBytes; }
  public String getSha256() { return sha256; }
  public DocumentStatus getStatus() { return status; }
  public UUID getCreatedBy() { return createdBy; }
  public OffsetDateTime getCreatedAt() { return createdAt; }
  public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
