package com.ametis.agentfactory.documents;

import com.ametis.agentfactory.drive.GoogleDriveRepository;
import com.ametis.agentfactory.knowledge.KnowledgeBaseDocumentRepository;
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
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DocumentService {
  private static final Logger LOGGER = LoggerFactory.getLogger(DocumentService.class);
  private static final Set<String> SUPPORTED_EXTENSIONS =
      Set.of("txt", "pdf", "docx", "xlsx", "csv", "url", "html", "htm");

  private final RepositoryProvisioningService provisioningService;
  private final DocumentAssetRepository assetRepository;
  private final KnowledgeBaseDocumentRepository knowledgeBaseDocumentRepository;
  private final GoogleDriveRepository googleDriveRepository;
  private final long maxFileSizeBytes;

  public DocumentService(
      RepositoryProvisioningService provisioningService,
      DocumentAssetRepository assetRepository,
      KnowledgeBaseDocumentRepository knowledgeBaseDocumentRepository,
      GoogleDriveRepository googleDriveRepository,
      @Value("${agent-factory.documents.max-file-size-bytes}") long maxFileSizeBytes) {
    this.provisioningService = provisioningService;
    this.assetRepository = assetRepository;
    this.knowledgeBaseDocumentRepository = knowledgeBaseDocumentRepository;
    this.googleDriveRepository = googleDriveRepository;
    this.maxFileSizeBytes = maxFileSizeBytes;
  }

  public DocumentResponse upload(UUID tenantId, UUID userId, MultipartFile file) {
    RepositoryBinding binding = requireActiveBinding(tenantId);
    String originalName = sanitizeName(file.getOriginalFilename());
    validate(originalName, file);
    try {
      byte[] content = file.getBytes();
      String sha256 = sha256(content);
      Optional<DocumentAsset> existing = assetRepository.findByTenantIdAndSha256(tenantId, sha256);
      if (existing.isPresent() && existing.get().getStatus() == DocumentStatus.STORED) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "This document content is already stored");
      }
      String mimeType = file.getContentType() == null ? "application/octet-stream" : file.getContentType();
      DocumentAsset asset = existing.orElseGet(() -> DocumentAsset.uploading(
          tenantId, binding.getId(), originalName, mimeType, content.length, sha256, userId));
      if (existing.isPresent()) {
        asset.retry(originalName, mimeType, content.length, userId);
      }
      assetRepository.save(asset);
      try {
        File stored = googleDriveRepository.upload(
            tenantId,
            binding.getDocumentsFolderId(),
            originalName,
            mimeType,
            content,
            Map.of(
                "workspaceId", tenantId.toString(),
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
      LOGGER.error("Google Drive upload failed for tenant {} and document {}", tenantId, originalName, exception);
      if (hasGoogleReason(exception, "storageQuotaExceeded")) {
        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "error.driveStorageQuota", exception);
      }
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Google Drive upload failed", exception);
    }
  }

  public List<DocumentResponse> list(UUID tenantId) {
    RepositoryBinding binding = requireActiveBinding(tenantId);
    List<DocumentAsset> assets = assetRepository.findAllByTenantIdOrderByCreatedAtDesc(tenantId);
    Map<String, DocumentAsset> assetsByDriveId = assets.stream()
        .filter(asset -> asset.getDriveFileId() != null)
        .collect(Collectors.toMap(DocumentAsset::getDriveFileId, Function.identity(), (first, ignored) -> first));
    try {
      List<File> driveFiles = googleDriveRepository.listDocuments(tenantId, binding.getDocumentsFolderId());
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
          .map(file -> fromDriveFile(file, assetsByDriveId.get(file.getId())))
          .sorted((left, right) -> right.modifiedAt().compareTo(left.modifiedAt()))
          .toList();
    } catch (IOException exception) {
      LOGGER.error(
          "Google Drive listing failed for tenant {} and folder {}",
          tenantId,
          binding.getDocumentsFolderId(),
          exception);
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Google Drive listing failed", exception);
    }
  }

  public DownloadDescriptor download(UUID tenantId, String driveFileId, OutputStream outputStream) {
    RepositoryBinding binding = requireActiveBinding(tenantId);
    try {
      File file = googleDriveRepository.getFile(tenantId, driveFileId);
      if (file.getParents() == null || !file.getParents().contains(binding.getDocumentsFolderId())) {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
      }
      googleDriveRepository.download(tenantId, driveFileId, outputStream);
      return new DownloadDescriptor(file.getName(), file.getMimeType());
    } catch (ResponseStatusException exception) {
      throw exception;
    } catch (IOException exception) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Google Drive download failed", exception);
    }
  }

  public void delete(UUID tenantId, String driveFileId) {
    RepositoryBinding binding = requireActiveBinding(tenantId);
    try {
      File file = googleDriveRepository.getFile(tenantId, driveFileId);
      if (file.getParents() == null || !file.getParents().contains(binding.getDocumentsFolderId())) {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
      }
      googleDriveRepository.trash(tenantId, driveFileId);
      assetRepository.findByTenantIdAndDriveFileId(tenantId, driveFileId).ifPresent(asset -> {
        asset.deleted();
        knowledgeBaseDocumentRepository.deleteAllByTenantIdAndDocumentAssetId(tenantId, asset.getId());
        assetRepository.save(asset);
      });
    } catch (ResponseStatusException exception) {
      throw exception;
    } catch (IOException exception) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Google Drive delete failed", exception);
    }
  }

  private RepositoryBinding requireActiveBinding(UUID tenantId) {
    RepositoryBinding binding = provisioningService.find(tenantId);
    if (binding.getStatus() != RepositoryStatus.ACTIVE || binding.getDocumentsFolderId() == null) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Document repository is not active");
    }
    return binding;
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
