package com.ametis.agentfactory.drive;

import com.google.api.client.http.ByteArrayContent;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.FileList;
import java.io.IOException;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class GoogleDriveRepository {
  private static final String FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

  private final GoogleDriveClientFactory driveClientFactory;
  private final DriveProperties properties;

  public GoogleDriveRepository(GoogleDriveClientFactory driveClientFactory, DriveProperties properties) {
    this.driveClientFactory = driveClientFactory;
    this.properties = properties;
  }

  public ProvisionedFolders provision(
      UUID tenantId, String workspaceId, String legacySlug, String namespace, String displayName)
      throws IOException {
    Drive drive = driveClientFactory.create(tenantId);
    Optional<File> workspace = findWorkspaceFolder(drive, workspaceId, legacySlug);
    File workspaceFolder = workspace.orElseGet(() -> {
      try {
        return createFolder(
            drive,
            namespace,
            properties.rootFolderId(),
            Map.of("workspaceId", workspaceId, "repositoryNamespace", namespace, "workspaceName", displayName));
      } catch (IOException exception) {
        throw new DriveOperationException(exception);
      }
    });
    String resolvedNamespace = workspace
        .map(file -> file.getAppProperties() == null
            ? file.getName()
            : file.getAppProperties().getOrDefault("repositoryNamespace", file.getName()))
        .orElse(namespace);
    File documentsFolder = findFolderByName(drive, workspaceFolder.getId(), "docs")
        .orElseGet(() -> {
          try {
            return createFolder(
                drive, "docs", workspaceFolder.getId(), Map.of("workspaceId", workspaceId, "purpose", "documents"));
          } catch (IOException exception) {
            throw new DriveOperationException(exception);
          }
        });
    return new ProvisionedFolders(resolvedNamespace, workspaceFolder.getId(), documentsFolder.getId());
  }

  /**
   * Crea (o encuentra) una subcarpeta {@code name} dentro de {@code parentId} y
   * devuelve su id. Se usa para la jerarquía negocio / base de conocimiento.
   */
  public String provisionFolder(
      UUID tenantId, String parentId, String name, Map<String, String> appProperties)
      throws IOException {
    Drive drive = driveClientFactory.create(tenantId);
    return findFolderByName(drive, parentId, name)
        .orElseGet(() -> {
          try {
            return createFolder(drive, name, parentId, appProperties);
          } catch (IOException exception) {
            throw new DriveOperationException(exception);
          }
        })
        .getId();
  }

  public File upload(
      UUID tenantId, String folderId, String name, String mimeType, byte[] content, Map<String, String> appProperties)
      throws IOException {
    Drive drive = driveClientFactory.create(tenantId);
    File metadata = new File()
        .setName(name)
        .setParents(List.of(folderId))
        .setAppProperties(appProperties);
    return drive.files()
        .create(metadata, new ByteArrayContent(mimeType, content))
        .setSupportsAllDrives(true)
        .setFields("id,name,mimeType,size,createdTime,modifiedTime,webViewLink,appProperties")
        .execute();
  }

  public List<File> listDocuments(UUID tenantId, String folderId) throws IOException {
    Drive drive = driveClientFactory.create(tenantId);
    List<File> files = new ArrayList<>();
    String pageToken = null;
    do {
      FileList page = drive.files().list()
          .setQ("'" + escape(folderId) + "' in parents and trashed = false and mimeType != '" + FOLDER_MIME_TYPE + "'")
          .setSupportsAllDrives(true)
          .setIncludeItemsFromAllDrives(true)
          .setFields("nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,appProperties)")
          .setPageToken(pageToken)
          .execute();
      if (page.getFiles() != null) {
        files.addAll(page.getFiles());
      }
      pageToken = page.getNextPageToken();
    } while (pageToken != null);
    return files;
  }

  public File getFile(UUID tenantId, String fileId) throws IOException {
    Drive drive = driveClientFactory.create(tenantId);
    return drive.files().get(fileId)
        .setSupportsAllDrives(true)
        .setFields("id,name,mimeType,size,parents")
        .execute();
  }

  public void download(UUID tenantId, String fileId, OutputStream outputStream) throws IOException {
    Drive drive = driveClientFactory.create(tenantId);
    drive.files().get(fileId).setSupportsAllDrives(true).executeMediaAndDownloadTo(outputStream);
  }

  public void trash(UUID tenantId, String fileId) throws IOException {
    Drive drive = driveClientFactory.create(tenantId);
    drive.files().update(fileId, new File().setTrashed(true))
        .setSupportsAllDrives(true)
        .setFields("id,trashed")
        .execute();
  }

  public void renameWorkspaceFolder(UUID tenantId, String folderId, String workspaceId, String namespace, String displayName)
      throws IOException {
    Drive drive = driveClientFactory.create(tenantId);
    File metadata = new File()
        .setName(namespace)
        .setAppProperties(Map.of(
            "workspaceId", workspaceId,
            "repositoryNamespace", namespace,
            "workspaceName", displayName));
    drive.files().update(folderId, metadata)
        .setSupportsAllDrives(true)
        .setFields("id,name,appProperties")
        .execute();
  }

  private Optional<File> findWorkspaceFolder(Drive drive, String workspaceId, String legacySlug) throws IOException {
    Optional<File> byProperty = findFirst(
        drive,
        "'" + escape(properties.rootFolderId()) + "' in parents and trashed = false and mimeType = '" + FOLDER_MIME_TYPE
            + "' and appProperties has { key='workspaceId' and value='" + escape(workspaceId) + "' }");
    if (byProperty.isPresent()) {
      return byProperty;
    }
    return findFolderByName(drive, properties.rootFolderId(), legacySlug);
  }

  private Optional<File> findFolderByName(Drive drive, String parentId, String name) throws IOException {
    return findFirst(
        drive,
        "'" + escape(parentId) + "' in parents and trashed = false and mimeType = '" + FOLDER_MIME_TYPE
            + "' and name = '" + escape(name) + "'");
  }

  private Optional<File> findFirst(Drive drive, String query) throws IOException {
    FileList result = drive.files().list()
        .setQ(query)
        .setSupportsAllDrives(true)
        .setIncludeItemsFromAllDrives(true)
        .setFields("files(id,name,appProperties)")
        .setPageSize(1)
        .execute();
    return result.getFiles() == null || result.getFiles().isEmpty()
        ? Optional.empty()
        : Optional.of(result.getFiles().getFirst());
  }

  private File createFolder(Drive drive, String name, String parentId, Map<String, String> appProperties)
      throws IOException {
    File metadata = new File()
        .setName(name)
        .setMimeType(FOLDER_MIME_TYPE)
        .setParents(List.of(parentId))
        .setAppProperties(appProperties);
    return drive.files().create(metadata)
        .setSupportsAllDrives(true)
        .setFields("id,name,appProperties")
        .execute();
  }

  private String escape(String value) {
    return value.replace("\\", "\\\\").replace("'", "\\'");
  }

  public record ProvisionedFolders(String namespace, String workspaceFolderId, String documentsFolderId) {}

  private static final class DriveOperationException extends RuntimeException {
    private DriveOperationException(IOException cause) {
      super(cause);
    }
  }
}
