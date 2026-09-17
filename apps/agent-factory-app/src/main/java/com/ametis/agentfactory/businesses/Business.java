package com.ametis.agentfactory.businesses;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Negocio: cliente final de un consultor/agencia dentro de un tenant. Es la
 * unidad de aislamiento real — sus agentes, bases de conocimiento y documentos
 * no se cruzan con los de otro negocio del mismo tenant.
 */
@Entity
@Table(name = "businesses")
public class Business {
  @Id
  private UUID id;

  @Column(nullable = false)
  private UUID tenantId;

  @Column(nullable = false, length = 120)
  private String name;

  @Column(nullable = false, length = 80)
  private String slug;

  @Column(length = 500)
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private BusinessStatus status;

  @Column(length = 160)
  private String storageLocator;

  // Vestigial: nunca se ha llegado a usar (cada base de conocimiento tiene su
  // propio documentsLocator; este campo a nivel de negocio quedó sin uso).
  // El nombre se deja sin renombrar a propósito porque la columna real de BD
  // sigue siendo `documents_folder_id` (no formaba parte del rename V21).
  @Column(name = "documents_folder_id", length = 160)
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

  protected Business() {}

  public static Business create(UUID tenantId, String name, String slug, String description, UUID createdBy) {
    Business business = new Business();
    business.id = UUID.randomUUID();
    business.tenantId = tenantId;
    business.name = name;
    business.slug = slug;
    business.description = description;
    business.status = BusinessStatus.ACTIVE;
    business.repositoryStatus = BusinessRepositoryStatus.PENDING;
    business.createdBy = createdBy;
    business.createdAt = OffsetDateTime.now();
    business.updatedAt = business.createdAt;
    return business;
  }

  public void update(String name, String description, BusinessStatus status) {
    this.name = name;
    this.description = description;
    this.status = status;
    updatedAt = OffsetDateTime.now();
  }

  public void markRepositoryActive(String storageLocator) {
    this.storageLocator = storageLocator;
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

  public UUID getId() { return id; }
  public UUID getTenantId() { return tenantId; }
  public String getName() { return name; }
  public String getSlug() { return slug; }
  public String getDescription() { return description; }
  public BusinessStatus getStatus() { return status; }
  public String getStorageLocator() { return storageLocator; }
  public String getDocumentsFolderId() { return documentsFolderId; }
  public BusinessRepositoryStatus getRepositoryStatus() { return repositoryStatus; }
  public String getRepositoryError() { return repositoryError; }
  public UUID getCreatedBy() { return createdBy; }
  public OffsetDateTime getCreatedAt() { return createdAt; }
  public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
