package com.ametis.agentfactory.documents;

import com.ametis.agentfactory.businesses.Business;
import com.ametis.agentfactory.businesses.BusinessRepositoryStatus;
import com.ametis.agentfactory.drive.GoogleDriveRepository;
import com.ametis.agentfactory.knowledge.KnowledgeBase;
import com.ametis.agentfactory.knowledge.KnowledgeBaseRepositoryProvisioningService;
import com.google.api.client.googleapis.json.GoogleJsonResponseException;
import com.google.api.services.drive.model.File;
import java.io.IOException;
import java.io.OutputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
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
 * Cada base tiene su carpeta de Drive; los documentos de bases distintas nunca
 * comparten carpeta.
 */
@Service
public class DocumentService {
  private static final Logger LOGGER = LoggerFactory.getLogger(DocumentService.class);
  private static final Set<String> SUPPORTED_EXTENSIONS =
      Set.of("txt", "pdf", "docx", "xlsx", "csv", "url", "html", "htm");

  private final RepositoryProvisioningService provisioningService;
  private final KnowledgeBaseRepositoryProvisioningService knowledgeBaseProvisioning;
  private final DocumentAssetRepository assetRepository;
  private final GoogleDriveRepository googleDriveRepository;
  private final long maxFileSizeBytes;

  public DocumentService(
      RepositoryProvisioningService provisioningService,
      KnowledgeBaseRepositoryProvisioningService knowledgeBaseProvisioning,
      DocumentAssetRepository assetRepository,
      GoogleDriveRepository googleDriveRepository,
      @Value("${agent-factory.documents.max-file-size-bytes}") long maxFileSizeBytes) {
    this.provisioningService = provisioningService;
    this.knowledgeBaseProvisioning = knowledgeBaseProvisioning;
    this.assetRepository = assetRepository;
    this.googleDriveRepository = googleDriveRepository;
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
        File stored = googleDriveRepository.upload(
            tenantId,
            ready.getDocumentsFolderId(),
            originalName,
            mimeType,
            content,
            Map.of(
                "workspaceId", tenantId.toString(),
                "businessId", business.getId().toString(),
                "knowledgeBaseId", ready.getId().toString(),
                "documentAssetId", asset.getId().toString(),
                "sha256", sha256));
        asset.stored(stored.getId());
        assetRepository.save(asset);
        return fromDriveFile(stored, asset);
      } catch (Exception exception) {
        asset.failed();
        assetRepository.save(asset);
        throw exception;
      }
    } catch (ResponseStatusException exception) {
      throw exception;
    } catch (Exception exception) {
      LOGGER.error("Google Drive upload failed for knowledge base {} and document {}", base.getId(), originalName, exception);
      if (hasGoogleReason(exception, "storageQuotaExceeded")) {
        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "error.driveStorageQuota", exception);
      }
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Google Drive upload failed", exception);
    }
  }

  public List<DocumentResponse> list(Business business, KnowledgeBase base) {
    KnowledgeBase ready = requireKbRepository(business, base);
    List<DocumentAsset> assets = assetRepository.findAllByKnowledgeBaseIdOrderByCreatedAtDesc(ready.getId());
    Map<String, DocumentAsset> assetsByDriveId = assets.stream()
        .filter(asset -> asset.getDriveFileId() != null)
        .collect(Collectors.toMap(DocumentAsset::getDriveFileId, Function.identity(), (first, ignored) -> first));
    try {
      List<File> driveFiles = googleDriveRepository.listDocuments(business.getTenantId(), ready.getDocumentsFolderId());
      Set<String> driveFileIds = driveFiles.stream().map(File::getId).collect(Collectors.toSet());
      List<DocumentAsset> externallyDeleted = assets.stream()
          .filter(asset -> asset.getStatus() == DocumentStatus.STORED)
          .filter(asset -> asset.getDriveFileId() != null && !driveFileIds.contains(asset.getDriveFileId()))
          .peek(DocumentAsset::deleted)
          .toList();
      if (!externallyDeleted.isEmpty()) {
        assetRepository.saveAll(externallyDeleted);
      }
      return driveFiles.stream()
          .map(fileEntry -> fromDriveFile(fileEntry, assetsByDriveId.get(fileEntry.getId())))
          .sorted((left, right) -> right.modifiedAt().compareTo(left.modifiedAt()))
          .toList();
    } catch (IOException exception) {
      LOGGER.error(
          "Google Drive listing failed for knowledge base {} and folder {}",
          ready.getId(),
          ready.getDocumentsFolderId(),
          exception);
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Google Drive listing failed", exception);
    }
  }

  public DownloadDescriptor download(Business business, KnowledgeBase base, String driveFileId, OutputStream outputStream) {
    KnowledgeBase ready = requireKbRepository(business, base);
    try {
      File file = googleDriveRepository.getFile(business.getTenantId(), driveFileId);
      if (file.getParents() == null || !file.getParents().contains(ready.getDocumentsFolderId())) {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
      }
      googleDriveRepository.download(business.getTenantId(), driveFileId, outputStream);
      return new DownloadDescriptor(file.getName(), file.getMimeType());
    } catch (ResponseStatusException exception) {
      throw exception;
    } catch (IOException exception) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Google Drive download failed", exception);
    }
  }

  @Transactional
  public void delete(Business business, KnowledgeBase base, String driveFileId) {
    KnowledgeBase ready = requireKbRepository(business, base);
    try {
      File file = googleDriveRepository.getFile(business.getTenantId(), driveFileId);
      if (file.getParents() == null || !file.getParents().contains(ready.getDocumentsFolderId())) {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
      }
      googleDriveRepository.trash(business.getTenantId(), driveFileId);
      assetRepository.findByKnowledgeBaseIdAndDriveFileId(ready.getId(), driveFileId).ifPresent(asset -> {
        asset.deleted();
        assetRepository.save(asset);
      });
    } catch (ResponseStatusException exception) {
      throw exception;
    } catch (IOException exception) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Google Drive delete failed", exception);
    }
  }

  private KnowledgeBase requireKbRepository(Business business, KnowledgeBase base) {
    KnowledgeBase ready = base.getRepositoryStatus() == BusinessRepositoryStatus.ACTIVE
        && base.getDocumentsFolderId() != null
        ? base
        : knowledgeBaseProvisioning.ensureProvisioned(business, base);
    if (ready.getRepositoryStatus() != BusinessRepositoryStatus.ACTIVE || ready.getDocumentsFolderId() == null) {
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

  private boolean hasGoogleReason(Throwable throwable, String expectedReason) {
    Throwable current = throwable;
    while (current != null) {
      if (current instanceof GoogleJsonResponseException googleException
          && googleException.getDetails() != null
          && googleException.getDetails().getErrors() != null
          && googleException.getDetails().getErrors().stream()
              .anyMatch(error -> expectedReason.equals(error.getReason()))) {
        return true;
      }
      current = current.getCause();
    }
    return false;
  }

  private DocumentResponse fromDriveFile(File file, DocumentAsset asset) {
    long size = file.getSize() == null ? (asset == null ? 0 : asset.getSizeBytes()) : file.getSize();
    OffsetDateTime createdAt = asset == null
        ? OffsetDateTime.ofInstant(Instant.ofEpochMilli(file.getCreatedTime().getValue()), ZoneOffset.UTC)
        : asset.getCreatedAt();
    return new DocumentResponse(
        file.getId(),
        file.getName(),
        file.getMimeType(),
        size,
        asset == null ? DocumentStatus.STORED : asset.getStatus(),
        asset == null ? null : asset.getSha256(),
        asset == null ? null : asset.getCreatedBy(),
        createdAt,
        file.getModifiedTime() == null ? createdAt.toString() : file.getModifiedTime().toString(),
        file.getWebViewLink());
  }

  public record DownloadDescriptor(String name, String mimeType) {}
}
