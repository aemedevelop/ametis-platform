package com.ametis.agentfactory.knowledge;

import com.ametis.agentfactory.businesses.BusinessRepositoryStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.text.Normalizer;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.UUID;

@Entity
@Table(name = "knowledge_bases")
public class KnowledgeBase {
  @Id
  private UUID id;

  @Column(nullable = false)
  private UUID tenantId;

  @Column(nullable = false, updatable = false)
  private UUID businessId;

  @Column(nullable = false, length = 120)
  private String name;

  @Column(length = 1000)
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private KnowledgeBaseStatus status;

  /** Carpeta de Drive propia: {tenant-workspace}/{negocio-slug}/{base-slug}/ */
  @Column(length = 160)
  private String documentsFolderId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private BusinessRepositoryStatus repositoryStatus;

  @Column(length = 1000)
  private String repositoryError;

  private UUID createdBy;

  @Column(nullable = false)
  private OffsetDateTime createdAt;

  @Column(nullable = false)
  private OffsetDateTime updatedAt;

  protected KnowledgeBase() {}

  public static KnowledgeBase create(UUID tenantId, UUID businessId, String name, String description, UUID createdBy) {
    KnowledgeBase base = new KnowledgeBase();
    base.id = UUID.randomUUID();
    base.tenantId = tenantId;
    base.businessId = businessId;
    base.name = name;
    base.description = description;
    base.status = KnowledgeBaseStatus.DRAFT;
    base.repositoryStatus = BusinessRepositoryStatus.PENDING;
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

  public void markRepositoryActive(String documentsFolderId) {
    this.documentsFolderId = documentsFolderId;
    this.repositoryStatus = BusinessRepositoryStatus.ACTIVE;
    this.repositoryError = null;
    updatedAt = OffsetDateTime.now();
  }

  public void markRepositoryError(String message) {
    this.repositoryStatus = BusinessRepositoryStatus.ERROR;
    this.repositoryError = message == null ? "Unknown error"
        : message.substring(0, Math.min(message.length(), 1000));
    updatedAt = OffsetDateTime.now();
  }

  /** Nombre de carpeta en Drive, único y estable dentro del negocio. */
  public String folderName() {
    String normalized = Normalizer.normalize(name, Normalizer.Form.NFD)
        .replaceAll("\\p{M}", "")
        .toLowerCase(Locale.ROOT)
        .replaceAll("[^a-z0-9]+", "-")
        .replaceAll("^-+|-+$", "");
    if (normalized.isBlank()) {
      normalized = "base";
    }
    String shortId = id.toString().substring(0, 8);
    return normalized.substring(0, Math.min(normalized.length(), 60)) + "--" + shortId;
  }

  public UUID getId() { return id; }
  public UUID getTenantId() { return tenantId; }
  public UUID getBusinessId() { return businessId; }
  public String getName() { return name; }
  public String getDescription() { return description; }
  public KnowledgeBaseStatus getStatus() { return status; }
  public String getDocumentsFolderId() { return documentsFolderId; }
  public BusinessRepositoryStatus getRepositoryStatus() { return repositoryStatus; }
  public String getRepositoryError() { return repositoryError; }
  public UUID getCreatedBy() { return createdBy; }
  public OffsetDateTime getCreatedAt() { return createdAt; }
  public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
