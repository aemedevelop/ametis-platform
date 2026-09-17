package com.ametis.agentfactory.storage;

import java.io.OutputStream;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Abstrae dónde viven los documentos y otros ficheros del tenant: hoy Google
 * Drive, opcionalmente MinIO. Selección por config
 * {@code agent-factory.storage.provider} ({@code drive}|{@code minio}), un
 * único bean de este tipo activo según el perfil.
 *
 * <p>El modelo es deliberadamente simple (contenedor + objeto identificado por
 * una clave opaca) para poder mapear tanto la jerarquía de carpetas de Drive
 * como prefijos de clave en un bucket S3/MinIO sin forzar un modelo común más
 * rico del que ninguno de los dos necesita hoy.
 */
public interface StorageProvider {

  /** Aprovisiona (o reutiliza) el espacio raíz del tenant. */
  ProvisionedWorkspace provisionWorkspace(
      UUID tenantId, String workspaceId, String legacySlug, String namespace, String displayName) throws Exception;

  /** Crea (o encuentra) un contenedor -carpeta o prefijo- dentro de {@code parentLocator}. */
  String provisionContainer(UUID tenantId, String parentLocator, String name, Map<String, String> metadata)
      throws Exception;

  StoredObject putObject(
      UUID tenantId, String containerLocator, String name, String mimeType, byte[] content, Map<String, String> metadata)
      throws Exception;

  List<StoredObject> listObjects(UUID tenantId, String containerLocator) throws Exception;

  StoredObject getObject(UUID tenantId, String objectKey) throws Exception;

  void downloadObject(UUID tenantId, String objectKey, OutputStream outputStream) throws Exception;

  /** Borrado. En Drive es reversible (papelera); en MinIO es definitivo. */
  void deleteObject(UUID tenantId, String objectKey) throws Exception;

  /** Borra un contenedor completo y todo lo que haya dentro. */
  void deleteContainer(UUID tenantId, String containerLocator) throws Exception;

  /** Renombra el espacio raíz del tenant. No-op en proveedores sin jerarquía de nombres (MinIO). */
  void renameWorkspace(UUID tenantId, String workspaceLocator, String workspaceId, String namespace, String displayName)
      throws Exception;

  record ProvisionedWorkspace(String namespace, String workspaceLocator, String documentsLocator, String bucketName) {}

  record StoredObject(
      String key,
      String name,
      String mimeType,
      Long sizeBytes,
      OffsetDateTime createdAt,
      OffsetDateTime modifiedAt,
      String viewUrl,
      List<String> containerKeys) {}
}
