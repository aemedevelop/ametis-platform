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
@Table(name = "repository_bindings")
public class RepositoryBinding {
  @Id
  private UUID id;

  @Column(nullable = false, unique = true)
  private UUID tenantId;

  @Column(nullable = false, unique = true, length = 80)
  private String repositoryNamespace;

  @Column(nullable = false, length = 32)
  private String provider;

  @Column(length = 160)
  private String workspaceFolderId;

  @Column(length = 160)
  private String documentsFolderId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private RepositoryStatus status;

  @Column(length = 1000)
  private String lastError;

  @Column(nullable = false)
  private OffsetDateTime createdAt;

  @Column(nullable = false)
  private OffsetDateTime updatedAt;

  protected RepositoryBinding() {}

  public static RepositoryBinding provisioning(UUID tenantId, String repositoryNamespace) {
    RepositoryBinding binding = new RepositoryBinding();
    binding.id = UUID.randomUUID();
    binding.tenantId = tenantId;
    binding.repositoryNamespace = repositoryNamespace;
    binding.provider = "GOOGLE_DRIVE";
    binding.status = RepositoryStatus.PROVISIONING;
    binding.createdAt = OffsetDateTime.now();
    binding.updatedAt = binding.createdAt;
    return binding;
  }

  public void markProvisioning() {
    status = RepositoryStatus.PROVISIONING;
    lastError = null;
    updatedAt = OffsetDateTime.now();
  }

  public void activate(String namespace, String workspaceFolderId, String documentsFolderId) {
    repositoryNamespace = namespace;
    this.workspaceFolderId = workspaceFolderId;
    this.documentsFolderId = documentsFolderId;
    status = RepositoryStatus.ACTIVE;
    lastError = null;
    updatedAt = OffsetDateTime.now();
  }

  public void renameNamespace(String namespace) {
    repositoryNamespace = namespace;
    updatedAt = OffsetDateTime.now();
  }

  public void fail(String message) {
    status = RepositoryStatus.ERROR;
    lastError = message == null ? "Unknown Google Drive error" : message.substring(0, Math.min(message.length(), 1000));
    updatedAt = OffsetDateTime.now();
  }

  public UUID getId() { return id; }
  public UUID getTenantId() { return tenantId; }
  public String getRepositoryNamespace() { return repositoryNamespace; }
  public String getProvider() { return provider; }
  public String getWorkspaceFolderId() { return workspaceFolderId; }
  public String getDocumentsFolderId() { return documentsFolderId; }
  public RepositoryStatus getStatus() { return status; }
  public String getLastError() { return lastError; }
  public OffsetDateTime getCreatedAt() { return createdAt; }
  public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
