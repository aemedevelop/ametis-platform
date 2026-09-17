package com.ametis.agentfactory.storage;

import com.ametis.agentfactory.drive.GoogleDriveRepository;
import com.google.api.services.drive.model.File;
import java.io.OutputStream;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * {@link StorageProvider} sobre Google Drive. Envuelve {@link GoogleDriveRepository}
 * sin cambiar su comportamiento -es el proveedor por defecto y el que ya está
 * en producción.
 */
@Component
@ConditionalOnProperty(prefix = "agent-factory.storage", name = "provider", havingValue = "drive", matchIfMissing = true)
public class GoogleDriveStorageProvider implements StorageProvider {
  private final GoogleDriveRepository googleDriveRepository;

  public GoogleDriveStorageProvider(GoogleDriveRepository googleDriveRepository) {
    this.googleDriveRepository = googleDriveRepository;
  }

  @Override
  public ProvisionedWorkspace provisionWorkspace(
      UUID tenantId, String workspaceId, String legacySlug, String namespace, String displayName) throws Exception {
    GoogleDriveRepository.ProvisionedFolders folders =
        googleDriveRepository.provision(tenantId, workspaceId, legacySlug, namespace, displayName);
    return new ProvisionedWorkspace(folders.namespace(), folders.workspaceLocator(), folders.documentsLocator(), null);
  }

  @Override
  public String provisionContainer(UUID tenantId, String parentLocator, String name, Map<String, String> metadata)
      throws Exception {
    return googleDriveRepository.provisionFolder(tenantId, parentLocator, name, metadata);
  }

  @Override
  public StoredObject putObject(
      UUID tenantId, String containerLocator, String name, String mimeType, byte[] content, Map<String, String> metadata)
      throws Exception {
    return toStoredObject(googleDriveRepository.upload(tenantId, containerLocator, name, mimeType, content, metadata));
  }

  @Override
  public List<StoredObject> listObjects(UUID tenantId, String containerLocator) throws Exception {
    return googleDriveRepository.listDocuments(tenantId, containerLocator).stream().map(this::toStoredObject).toList();
  }

  @Override
  public StoredObject getObject(UUID tenantId, String objectKey) throws Exception {
    return toStoredObject(googleDriveRepository.getFile(tenantId, objectKey));
  }

  @Override
  public void downloadObject(UUID tenantId, String objectKey, OutputStream outputStream) throws Exception {
    googleDriveRepository.download(tenantId, objectKey, outputStream);
  }

  @Override
  public void deleteObject(UUID tenantId, String objectKey) throws Exception {
    googleDriveRepository.trash(tenantId, objectKey);
  }

  @Override
  public void deleteContainer(UUID tenantId, String containerLocator) throws Exception {
    googleDriveRepository.trash(tenantId, containerLocator);
  }

  @Override
  public void renameWorkspace(
      UUID tenantId, String workspaceLocator, String workspaceId, String namespace, String displayName) throws Exception {
    googleDriveRepository.renameWorkspaceFolder(tenantId, workspaceLocator, workspaceId, namespace, displayName);
  }

  private StoredObject toStoredObject(File file) {
    OffsetDateTime createdAt = file.getCreatedTime() == null
        ? null
        : OffsetDateTime.ofInstant(Instant.ofEpochMilli(file.getCreatedTime().getValue()), ZoneOffset.UTC);
    OffsetDateTime modifiedAt = file.getModifiedTime() == null
        ? null
        : OffsetDateTime.ofInstant(Instant.ofEpochMilli(file.getModifiedTime().getValue()), ZoneOffset.UTC);
    return new StoredObject(
        file.getId(),
        file.getName(),
        file.getMimeType(),
        file.getSize(),
        createdAt,
        modifiedAt,
        file.getWebViewLink(),
        file.getParents());
  }
}
