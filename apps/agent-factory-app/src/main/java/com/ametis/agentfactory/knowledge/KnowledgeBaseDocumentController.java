package com.ametis.agentfactory.knowledge;

import com.ametis.agentfactory.access.AccessGuard;
import com.ametis.agentfactory.businesses.Business;
import com.ametis.agentfactory.businesses.BusinessService;
import com.ametis.agentfactory.documents.DocumentResponse;
import com.ametis.agentfactory.documents.DocumentService;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping({"/v1", "/api/agent-factory"})
public class KnowledgeBaseDocumentController {
  private final AccessGuard accessGuard;
  private final BusinessService businessService;
  private final KnowledgeBaseRepository knowledgeBaseRepository;
  private final DocumentService documentService;

  public KnowledgeBaseDocumentController(
      AccessGuard accessGuard,
      BusinessService businessService,
      KnowledgeBaseRepository knowledgeBaseRepository,
      DocumentService documentService) {
    this.accessGuard = accessGuard;
    this.businessService = businessService;
    this.knowledgeBaseRepository = knowledgeBaseRepository;
    this.documentService = documentService;
  }

  private record Context(Business business, KnowledgeBase base) {}

  private Context context(JwtAuthenticationToken authentication, String permission, UUID knowledgeBaseId) {
    UUID tenantId = accessGuard.requireAccess(authentication, permission);
    Business business = businessService.require(tenantId, accessGuard.requireBusinessId());
    KnowledgeBase base = knowledgeBaseRepository.findByIdAndBusinessId(knowledgeBaseId, business.getId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.knowledgeBaseNotFound"));
    return new Context(business, base);
  }

  @GetMapping("/knowledge-bases/{knowledgeBaseId}/documents")
  public List<DocumentResponse> list(
      @PathVariable UUID knowledgeBaseId,
      JwtAuthenticationToken authentication) {
    Context context = context(authentication, AccessGuard.DOCUMENTS_READ, knowledgeBaseId);
    return documentService.list(context.business(), context.base());
  }

  @PostMapping(value = "/knowledge-bases/{knowledgeBaseId}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<DocumentResponse> upload(
      @PathVariable UUID knowledgeBaseId,
      @RequestPart("file") MultipartFile file,
      JwtAuthenticationToken authentication) {
    Context context = context(authentication, AccessGuard.DOCUMENTS_MANAGE, knowledgeBaseId);
    DocumentResponse response = documentService.upload(
        context.business(), context.base(), accessGuard.currentUserId(authentication), file);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @GetMapping("/knowledge-bases/{knowledgeBaseId}/documents/{driveFileId}/download")
  public ResponseEntity<byte[]> download(
      @PathVariable UUID knowledgeBaseId,
      @PathVariable String driveFileId,
      JwtAuthenticationToken authentication) {
    Context context = context(authentication, AccessGuard.DOCUMENTS_READ, knowledgeBaseId);
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    DocumentService.DownloadDescriptor descriptor = documentService.download(
        context.business(), context.base(), driveFileId, output);
    ContentDisposition disposition = ContentDisposition.attachment()
        .filename(descriptor.name(), StandardCharsets.UTF_8)
        .build();
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(descriptor.mimeType()))
        .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
        .body(output.toByteArray());
  }

  @DeleteMapping("/knowledge-bases/{knowledgeBaseId}/documents/{driveFileId}")
  public ResponseEntity<Void> delete(
      @PathVariable UUID knowledgeBaseId,
      @PathVariable String driveFileId,
      JwtAuthenticationToken authentication) {
    Context context = context(authentication, AccessGuard.DOCUMENTS_MANAGE, knowledgeBaseId);
    documentService.delete(context.business(), context.base(), driveFileId);
    return ResponseEntity.noContent().build();
  }
}
