package com.ametis.agentfactory.businesses;

import com.ametis.agentfactory.access.AccessGuard;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/v1", "/api/agent-factory"})
public class BusinessController {
  private final AccessGuard accessGuard;
  private final BusinessService businessService;
  private final BusinessDeletionService businessDeletionService;

  public BusinessController(
      AccessGuard accessGuard,
      BusinessService businessService,
      BusinessDeletionService businessDeletionService) {
    this.accessGuard = accessGuard;
    this.businessService = businessService;
    this.businessDeletionService = businessDeletionService;
  }

  @GetMapping("/businesses")
  public List<BusinessResponse> list(JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_READ);
    return businessService.list(tenantId);
  }

  @PostMapping("/businesses")
  public ResponseEntity<BusinessResponse> create(
      @Valid @RequestBody BusinessRequest request,
      JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_MANAGE);
    BusinessResponse response = businessService.create(
        tenantId, accessGuard.currentUserId(authentication), request);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @PatchMapping("/businesses/{businessId}")
  public BusinessResponse update(
      @PathVariable UUID businessId,
      @Valid @RequestBody BusinessRequest request,
      JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_MANAGE);
    return businessService.update(tenantId, businessId, request);
  }

  @PostMapping("/businesses/{businessId}/delete")
  public ResponseEntity<Void> delete(
      @PathVariable UUID businessId,
      @Valid @RequestBody BusinessDeleteRequest request,
      JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_MANAGE);
    businessDeletionService.delete(
        tenantId, businessId, accessGuard.currentUserId(authentication), request.confirmationName());
    return ResponseEntity.noContent().build();
  }
}
