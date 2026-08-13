package com.ametis.agentfactory.documents;

import com.ametis.agentfactory.access.AccessGuard;
import com.ametis.agentfactory.access.CorePlatformClient;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping({"/v1", "/api/agent-factory"})
public class DocumentController {
  private final AccessGuard accessGuard;
  private final RepositoryProvisioningService provisioningService;
  private final DocumentService documentService;

  public DocumentController(
      AccessGuard accessGuard,
      RepositoryProvisioningService provisioningService,
      DocumentService documentService) {
    this.accessGuard = accessGuard;
    this.provisioningService = provisioningService;
    this.documentService = documentService;
  }

  @GetMapping("/repository")
  public RepositoryResponse repository(JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_READ);
    return RepositoryResponse.from(provisioningService.find(tenantId));
  }

  @PostMapping("/repository/provision")
  public RepositoryResponse provision(
      @Valid @RequestBody(required = false) RepositoryNamespaceRequest request,
      JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_MANAGE);
    CorePlatformClient.TenantDto tenant = accessGuard.requireTenant(authentication, tenantId);
    String namespace = request == null ? null : request.repositoryNamespace();
    return RepositoryResponse.from(provisioningService.provision(tenant, namespace));
  }

  @PatchMapping("/repository/namespace")
  public RepositoryResponse renameRepository(
      @Valid @RequestBody RepositoryNamespaceRequest request,
      JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_MANAGE);
    CorePlatformClient.TenantDto tenant = accessGuard.requireTenant(authentication, tenantId);
    return RepositoryResponse.from(provisioningService.rename(tenant, request.repositoryNamespace()));
  }

  @GetMapping("/documents")
  public List<DocumentResponse> list(JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_READ);
    return documentService.list(tenantId);
  }

  @PostMapping(value = "/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<DocumentResponse> upload(
      @RequestPart("file") MultipartFile file,
      JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_MANAGE);
    DocumentResponse response = documentService.upload(tenantId, accessGuard.currentUserId(authentication), file);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @GetMapping("/documents/{driveFileId}/download")
  public ResponseEntity<byte[]> download(
      @PathVariable String driveFileId,
      JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_READ);
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    DocumentService.DownloadDescriptor descriptor = documentService.download(tenantId, driveFileId, output);
    ContentDisposition disposition = ContentDisposition.attachment()
        .filename(descriptor.name(), StandardCharsets.UTF_8)
        .build();
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(descriptor.mimeType()))
        .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
        .body(output.toByteArray());
  }

  @DeleteMapping("/documents/{driveFileId}")
  public ResponseEntity<Void> delete(
      @PathVariable String driveFileId,
      JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_MANAGE);
    documentService.delete(tenantId, driveFileId);
    return ResponseEntity.noContent().build();
  }
}
