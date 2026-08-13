package com.ametis.agentfactory.knowledge;

import com.ametis.agentfactory.access.AccessGuard;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/v1", "/api/agent-factory"})
public class KnowledgeBaseController {
  private final AccessGuard accessGuard;
  private final KnowledgeBaseService knowledgeBaseService;

  public KnowledgeBaseController(AccessGuard accessGuard, KnowledgeBaseService knowledgeBaseService) {
    this.accessGuard = accessGuard;
    this.knowledgeBaseService = knowledgeBaseService;
  }

  @GetMapping("/knowledge-bases")
  public List<KnowledgeBaseResponse> list(JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_READ);
    return knowledgeBaseService.list(tenantId);
  }

  @PostMapping("/knowledge-bases")
  public ResponseEntity<KnowledgeBaseResponse> create(
      @Valid @RequestBody KnowledgeBaseRequest request,
      JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_MANAGE);
    KnowledgeBaseResponse response = knowledgeBaseService.create(
        tenantId, accessGuard.currentUserId(authentication), request);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @PatchMapping("/knowledge-bases/{knowledgeBaseId}")
  public KnowledgeBaseResponse update(
      @PathVariable UUID knowledgeBaseId,
      @Valid @RequestBody KnowledgeBaseRequest request,
      JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_MANAGE);
    return knowledgeBaseService.update(tenantId, knowledgeBaseId, request);
  }

  @DeleteMapping("/knowledge-bases/{knowledgeBaseId}")
  public ResponseEntity<Void> delete(
      @PathVariable UUID knowledgeBaseId,
      JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_MANAGE);
    knowledgeBaseService.delete(tenantId, knowledgeBaseId);
    return ResponseEntity.noContent().build();
  }
}
