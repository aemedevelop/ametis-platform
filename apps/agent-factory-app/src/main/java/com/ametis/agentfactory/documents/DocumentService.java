package com.ametis.agentfactory.documents;

import com.ametis.agentfactory.businesses.Business;
import com.ametis.agentfactory.businesses.BusinessRepositoryStatus;
import com.ametis.agentfactory.knowledge.KnowledgeBase;
import com.ametis.agentfactory.knowledge.KnowledgeBaseRepositoryProvisioningService;
import com.ametis.agentfactory.storage.StorageProvider;
import java.io.OutputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Gestión de documentos, siempre dentro de una base de conocimiento concreta.
 * Cada base tiene su propio contenedor de almacenamiento; los documentos de
 * bases distintas nunca comparten contenedor.
 */
@Service
public class DocumentService {
  private static final Logger LOGGER = LoggerFactory.getLogger(DocumentService.class);
  private static final Set<String> SUPPORTED_EXTENSIONS =
      Set.of("txt", "pdf", "docx", "xlsx", "csv", "url", "html", "htm");

  private final RepositoryProvisioningService provisioningService;
  private final KnowledgeBaseRepositoryProvisioningService knowledgeBaseProvisioning;
  private final DocumentAssetRepository assetRepository;
  private final StorageProvider storageProvider;
  private final long maxFileSizeBytes;

  public DocumentService(
      RepositoryProvisioningService provisioningService,
      KnowledgeBaseRepositoryProvisioningService knowledgeBaseProvisioning,
      DocumentAssetRepository assetRepository,
      StorageProvider storageProvider,
      @Value("${agent-factory.documents.max-file-size-bytes}") long maxFileSizeBytes) {
    this.provisioningService = provisioningService;
    this.knowledgeBaseProvisioning = knowledgeBaseProvisioning;
    this.assetRepository = assetRepository;
    this.storageProvider = storageProvider;
    this.maxFileSizeBytes = maxFileSizeBytes;
  }

  public DocumentResponse upload(Business business, KnowledgeBase base, UUID userId, MultipartFile file) {
    KnowledgeBase ready = requireKbRepository(business, base);
    UUID tenantId = business.getTenantId();
    RepositoryBinding binding = provisioningService.find(tenantId);
    String originalName = sanitizeName(file.getOriginalFilename());
    validate(originalName, file);
    try {
      byte[] content = file.getBytes();
      String sha256 = sha256(content);
      Optional<DocumentAsset> existing = assetRepository.findByKnowledgeBaseIdAndSha256(ready.getId(), sha256);
      if (existing.isPresent() && existing.get().getStatus() == DocumentStatus.STORED) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "error.documentAlreadyStored");
      }
      String mimeType = file.getContentType() == null ? "application/octet-stream" : file.getContentType();
      DocumentAsset asset = existing.orElseGet(() -> DocumentAsset.uploading(
          tenantId, business.getId(), ready.getId(), binding.getId(),
          originalName, mimeType, content.length, sha256, userId));
      if (existing.isPresent()) {
        asset.retry(originalName, mimeType, content.length, userId);
      }
      assetRepository.save(asset);
      try {
        StorageProvider.StoredObject stored = storageProvider.putObject(
            tenantId,
            ready.getDocumentsLocator(),
            originalName,
            mimeType,
            content,
            Map.of(
                "workspaceId", tenantId.toString(),
                "businessId", business.getId().toString(),
                "knowledgeBaseId", ready.getId().toString(),
                "documentAssetId", asset.getId().toString(),
                "sha256", sha256));
        asset.stored(stored.key());
        assetRepository.save(asset);
        return fromStoredObject(stored, asset);
      } catch (Exception exception) {
        asset.failed();
        assetRepository.save(asset);
        throw exception;
      }
    } catch (ResponseStatusException exception) {
      throw exception;
    } catch (Exception exception) {
      LOGGER.error("Storage upload failed for knowledge base {} and document {}", base.getId(), originalName, exception);
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "error.storageUploadFailed", exception);
    }
  }

  public List<DocumentResponse> list(Business business, KnowledgeBase base) {
    KnowledgeBase ready = requireKbRepository(business, base);
    List<DocumentAsset> assets = assetRepository.findAllByKnowledgeBaseIdOrderByCreatedAtDesc(ready.getId());
    Map<String, DocumentAsset> assetsByObjectKey = assets.stream()
        .filter(asset -> asset.getStorageObjectKey() != null)
        .collect(Collectors.toMap(DocumentAsset::getStorageObjectKey, Function.identity(), (first, ignored) -> first));
    try {
      List<StorageProvider.StoredObject> storedObjects = storageProvider.listObjects(business.getTenantId(), ready.getDocumentsLocator());
      Set<String> storageObjectKeys = storedObjects.stream().map(StorageProvider.StoredObject::key).collect(Collectors.toSet());
      List<DocumentAsset> externallyDeleted = assets.stream()
          .filter(asset -> asset.getStatus() == DocumentStatus.STORED)
          .filter(asset -> asset.getStorageObjectKey() != null && !storageObjectKeys.contains(asset.getStorageObjectKey()))
          .peek(DocumentAsset::deleted)
          .toList();
      if (!externallyDeleted.isEmpty()) {
        assetRepository.saveAll(externallyDeleted);
      }
      return storedObjects.stream()
          .map(object -> fromStoredObject(object, assetsByObjectKey.get(object.key())))
          .sorted((left, right) -> right.modifiedAt().compareTo(left.modifiedAt()))
          .toList();
    } catch (Exception exception) {
      LOGGER.error(
          "Storage listing failed for knowledge base {} and container {}",
          ready.getId(),
          ready.getDocumentsLocator(),
          exception);
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "error.storageListingFailed", exception);
    }
  }

  public DownloadDescriptor download(Business business, KnowledgeBase base, String storageObjectKey, OutputStream outputStream) {
    KnowledgeBase ready = requireKbRepository(business, base);
    try {
      StorageProvider.StoredObject object = storageProvider.getObject(business.getTenantId(), storageObjectKey);
      requireOwnedByContainer(object, ready.getDocumentsLocator());
      storageProvider.downloadObject(business.getTenantId(), storageObjectKey, outputStream);
      return new DownloadDescriptor(object.name(), object.mimeType());
    } catch (ResponseStatusException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "error.storageDownloadFailed", exception);
    }
  }

  @Transactional
  public void delete(Business business, KnowledgeBase base, String storageObjectKey) {
    KnowledgeBase ready = requireKbRepository(business, base);
    try {
      StorageProvider.StoredObject object = storageProvider.getObject(business.getTenantId(), storageObjectKey);
      requireOwnedByContainer(object, ready.getDocumentsLocator());
      storageProvider.deleteObject(business.getTenantId(), storageObjectKey);
      assetRepository.findByKnowledgeBaseIdAndStorageObjectKey(ready.getId(), storageObjectKey).ifPresent(asset -> {
        asset.deleted();
        assetRepository.save(asset);
      });
    } catch (ResponseStatusException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "error.storageDeleteFailed", exception);
    }
  }

  private void requireOwnedByContainer(StorageProvider.StoredObject object, String documentsLocator) {
    if (object.containerKeys() == null || !object.containerKeys().contains(documentsLocator)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
    }
  }

  private KnowledgeBase requireKbRepository(Business business, KnowledgeBase base) {
    KnowledgeBase ready = base.getRepositoryStatus() == BusinessRepositoryStatus.ACTIVE
        && base.getDocumentsLocator() != null
        ? base
        : knowledgeBaseProvisioning.ensureProvisioned(business, base);
    if (ready.getRepositoryStatus() != BusinessRepositoryStatus.ACTIVE || ready.getDocumentsLocator() == null) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.repositoryNotActive");
    }
    return ready;
  }

  private void validate(String name, MultipartFile file) {
    if (file.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document is empty");
    }
    if (file.getSize() > maxFileSizeBytes) {
      throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Document exceeds the configured size limit");
    }
    String extension = name.contains(".") ? name.substring(name.lastIndexOf('.') + 1).toLowerCase() : "";
    if (!SUPPORTED_EXTENSIONS.contains(extension)) {
      throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "error.unsupportedFileType");
    }
  }

  private String sanitizeName(String rawName) {
    if (rawName == null || rawName.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document name is required");
    }
    String normalized = rawName.replace('\\', '/');
    String name = normalized.substring(normalized.lastIndexOf('/') + 1).trim();
    if (name.isBlank() || name.length() > 255) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid document name");
    }
    return name;
  }

  private String sha256(byte[] content) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException(exception);
    }
  }

  private DocumentResponse fromStoredObject(StorageProvider.StoredObject object, DocumentAsset asset) {
    long size = object.sizeBytes() == null ? (asset == null ? 0 : asset.getSizeBytes()) : object.sizeBytes();
    OffsetDateTime createdAt = asset != null
        ? asset.getCreatedAt()
        : object.createdAt() != null ? object.createdAt() : OffsetDateTime.now();
    return new DocumentResponse(
        object.key(),
        object.name(),
        object.mimeType(),
        size,
        asset == null ? DocumentStatus.STORED : asset.getStatus(),
        asset == null ? null : asset.getSha256(),
        asset == null ? null : asset.getCreatedBy(),
        createdAt,
        object.modifiedAt() == null ? createdAt.toString() : object.modifiedAt().toString(),
        object.viewUrl());
  }

  public record DownloadDescriptor(String name, String mimeType) {}
}
