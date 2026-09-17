package com.ametis.agentfactory.storage;

import com.ametis.agentfactory.documents.RepositoryBinding;
import com.ametis.agentfactory.documents.RepositoryBindingRepository;
import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.ListObjectsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.Result;
import io.minio.StatObjectArgs;
import io.minio.StatObjectResponse;
import io.minio.messages.Item;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.text.Normalizer;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * {@link StorageProvider} sobre MinIO/S3: un bucket por tenant, negocios y
 * bases de conocimiento como prefijos de clave dentro de ese bucket.
 * {@code containerLocator}/{@code objectKey} nunca incluyen el bucket -se
 * resuelve por tenant vía {@link RepositoryBindingRepository}.
 */
@Component
@ConditionalOnProperty(prefix = "agent-factory.storage", name = "provider", havingValue = "minio")
public class MinioStorageProvider implements StorageProvider {
  private final MinioClient client;
  private final RepositoryBindingRepository bindingRepository;
  private final String bucketPrefix;

  public MinioStorageProvider(
      @Value("${agent-factory.minio.endpoint}") String endpoint,
      @Value("${agent-factory.minio.access-key}") String accessKey,
      @Value("${agent-factory.minio.secret-key}") String secretKey,
      @Value("${agent-factory.minio.bucket-prefix:af-}") String bucketPrefix,
      RepositoryBindingRepository bindingRepository) {
    this.client = MinioClient.builder()
        .endpoint(endpoint)
        .credentials(accessKey, secretKey)
        .build();
    this.bindingRepository = bindingRepository;
    this.bucketPrefix = bucketPrefix;
  }

  @Override
  public ProvisionedWorkspace provisionWorkspace(
      UUID tenantId, String workspaceId, String legacySlug, String namespace, String displayName) throws Exception {
    String bucket = bucketNameFor(namespace);
    if (!client.bucketExists(BucketExistsArgs.builder().bucket(bucket).build())) {
      client.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
    }
    return new ProvisionedWorkspace(namespace, "", "", bucket);
  }

  @Override
  public String provisionContainer(UUID tenantId, String parentLocator, String name, Map<String, String> metadata) {
    return normalizedPrefix(parentLocator) + slug(name) + "/";
  }

  @Override
  public StoredObject putObject(
      UUID tenantId, String containerLocator, String name, String mimeType, byte[] content, Map<String, String> metadata)
      throws Exception {
    String bucket = resolveBucket(tenantId);
    String assetId = metadata == null ? null : metadata.get("documentAssetId");
    String objectKey =
        normalizedPrefix(containerLocator) + (assetId == null ? UUID.randomUUID().toString() : assetId) + "__" + slug(name);
    Map<String, String> userMetadata = new HashMap<>(metadata == null ? Map.of() : metadata);
    userMetadata.put("original-name", name);
    try (InputStream input = new ByteArrayInputStream(content)) {
      client.putObject(PutObjectArgs.builder()
          .bucket(bucket)
          .object(objectKey)
          .stream(input, content.length, -1)
          .contentType(mimeType == null ? "application/octet-stream" : mimeType)
          .userMetadata(userMetadata)
          .build());
    }
    return getObject(tenantId, objectKey);
  }

  @Override
  public List<StoredObject> listObjects(UUID tenantId, String containerLocator) throws Exception {
    String bucket = resolveBucket(tenantId);
    List<StoredObject> results = new ArrayList<>();
    Iterable<Result<Item>> items = client.listObjects(ListObjectsArgs.builder()
        .bucket(bucket)
        .prefix(normalizedPrefix(containerLocator))
        .recursive(false)
        .build());
    for (Result<Item> result : items) {
      Item item = result.get();
      if (item.isDir()) {
        continue;
      }
      results.add(getObject(tenantId, item.objectName()));
    }
    return results;
  }

  @Override
  public StoredObject getObject(UUID tenantId, String objectKey) throws Exception {
    String bucket = resolveBucket(tenantId);
    StatObjectResponse stat = client.statObject(StatObjectArgs.builder().bucket(bucket).object(objectKey).build());
    String originalName = stat.userMetadata().getOrDefault("original-name", fileNameOf(objectKey));
    OffsetDateTime modifiedAt = stat.lastModified() == null ? null : stat.lastModified().toOffsetDateTime();
    int lastSlash = objectKey.lastIndexOf('/');
    String containerKey = lastSlash < 0 ? "" : objectKey.substring(0, lastSlash + 1);
    return new StoredObject(objectKey, originalName, stat.contentType(), stat.size(), modifiedAt, modifiedAt, null, List.of(containerKey));
  }

  @Override
  public void downloadObject(UUID tenantId, String objectKey, OutputStream outputStream) throws Exception {
    String bucket = resolveBucket(tenantId);
    try (InputStream input = client.getObject(GetObjectArgs.builder().bucket(bucket).object(objectKey).build())) {
      input.transferTo(outputStream);
    }
  }

  @Override
  public void deleteObject(UUID tenantId, String objectKey) throws Exception {
    client.removeObject(RemoveObjectArgs.builder().bucket(resolveBucket(tenantId)).object(objectKey).build());
  }

  @Override
  public void deleteContainer(UUID tenantId, String containerLocator) throws Exception {
    String bucket = resolveBucket(tenantId);
    String prefix = normalizedPrefix(containerLocator);
    for (Result<Item> result : client.listObjects(
        ListObjectsArgs.builder().bucket(bucket).prefix(prefix).recursive(true).build())) {
      Item item = result.get();
      client.removeObject(RemoveObjectArgs.builder().bucket(bucket).object(item.objectName()).build());
    }
  }

  @Override
  public void renameWorkspace(
      UUID tenantId, String workspaceLocator, String workspaceId, String namespace, String displayName) {
    // El bucket se nombra por namespace en el momento del aprovisionamiento y no
    // se renombra (S3/MinIO no soportan renombrar buckets). No-op deliberado.
  }

  private String resolveBucket(UUID tenantId) {
    return bindingRepository.findByTenantId(tenantId)
        .map(RepositoryBinding::getBucketName)
        .filter(name -> name != null && !name.isBlank())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "error.repositoryNotActive"));
  }

  private String bucketNameFor(String namespace) {
    String normalized = Normalizer.normalize(namespace, Normalizer.Form.NFD)
        .replaceAll("\\p{M}", "")
        .toLowerCase(Locale.ROOT)
        .replaceAll("[^a-z0-9-]", "-")
        .replaceAll("-{2,}", "-")
        .replaceAll("^-+|-+$", "");
    String candidate = bucketPrefix + normalized;
    if (candidate.length() > 63) {
      candidate = candidate.substring(0, 63).replaceAll("-+$", "");
    }
    return candidate.length() < 3 ? candidate + "-bkt" : candidate;
  }

  private String normalizedPrefix(String locator) {
    if (locator == null || locator.isBlank()) {
      return "";
    }
    return locator.endsWith("/") ? locator : locator + "/";
  }

  private String slug(String name) {
    String normalized = Normalizer.normalize(name == null ? "" : name, Normalizer.Form.NFD)
        .replaceAll("\\p{M}", "")
        .toLowerCase(Locale.ROOT)
        .replaceAll("[^a-z0-9._-]", "-")
        .replaceAll("-{2,}", "-");
    return normalized.isBlank() ? "archivo" : normalized;
  }

  private String fileNameOf(String objectKey) {
    int lastSlash = objectKey.lastIndexOf('/');
    String fileName = lastSlash < 0 ? objectKey : objectKey.substring(lastSlash + 1);
    int separator = fileName.indexOf("__");
    return separator < 0 ? fileName : fileName.substring(separator + 2);
  }
}
