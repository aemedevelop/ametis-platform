package com.ametis.agentfactory.knowledge;

import com.ametis.agentfactory.access.AccessGuard;
import com.ametis.agentfactory.businesses.Business;
import com.ametis.agentfactory.businesses.BusinessService;
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
  private final BusinessService businessService;
  private final KnowledgeBaseService knowledgeBaseService;

  public KnowledgeBaseController(
      AccessGuard accessGuard, BusinessService businessService, KnowledgeBaseService knowledgeBaseService) {
    this.accessGuard = accessGuard;
    this.businessService = businessService;
    this.knowledgeBaseService = knowledgeBaseService;
  }

  private Business business(JwtAuthenticationToken authentication, String permission) {
    UUID tenantId = accessGuard.requireAccess(authentication, permission);
    return businessService.require(tenantId, accessGuard.requireBusinessId());
  }

  @GetMapping("/knowledge-bases")
  public List<KnowledgeBaseResponse> list(JwtAuthenticationToken authentication) {
    return knowledgeBaseService.list(business(authentication, AccessGuard.DOCUMENTS_READ));
  }

  @PostMapping("/knowledge-bases")
  public ResponseEntity<KnowledgeBaseResponse> create(
      @Valid @RequestBody KnowledgeBaseRequest request,
      JwtAuthenticationToken authentication) {
    Business business = business(authentication, AccessGuard.DOCUMENTS_MANAGE);
    KnowledgeBaseResponse response = knowledgeBaseService.create(
        business, accessGuard.currentUserId(authentication), request);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @PatchMapping("/knowledge-bases/{knowledgeBaseId}")
  public KnowledgeBaseResponse update(
      @PathVariable UUID knowledgeBaseId,
      @Valid @RequestBody KnowledgeBaseRequest request,
      JwtAuthenticationToken authentication) {
    return knowledgeBaseService.update(business(authentication, AccessGuard.DOCUMENTS_MANAGE), knowledgeBaseId, request);
  }

  @DeleteMapping("/knowledge-bases/{knowledgeBaseId}")
  public ResponseEntity<Void> delete(
      @PathVariable UUID knowledgeBaseId,
      JwtAuthenticationToken authentication) {
    knowledgeBaseService.delete(business(authentication, AccessGuard.DOCUMENTS_MANAGE), knowledgeBaseId);
    return ResponseEntity.noContent().build();
  }
}
