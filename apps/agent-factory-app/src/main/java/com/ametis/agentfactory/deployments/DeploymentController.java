package com.ametis.agentfactory.deployments;

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
public class DeploymentController {
  private final AccessGuard accessGuard;
  private final DeploymentService deploymentService;

  public DeploymentController(AccessGuard accessGuard, DeploymentService deploymentService) {
    this.accessGuard = accessGuard;
    this.deploymentService = deploymentService;
  }

  @GetMapping("/deployments")
  public List<DeploymentResponse> list(JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_READ);
    return deploymentService.list(tenantId);
  }

  @PostMapping("/deployments")
  public ResponseEntity<DeploymentResponse> create(
      @Valid @RequestBody DeploymentRequest request,
      JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_MANAGE);
    DeploymentResponse response = deploymentService.create(tenantId, accessGuard.currentUserId(authentication), request);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @PatchMapping("/deployments/{deploymentId}")
  public DeploymentResponse update(
      @PathVariable UUID deploymentId,
      @Valid @RequestBody DeploymentRequest request,
      JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_MANAGE);
    return deploymentService.update(tenantId, deploymentId, request);
  }

  @DeleteMapping("/deployments/{deploymentId}")
  public ResponseEntity<Void> delete(
      @PathVariable UUID deploymentId,
      JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_MANAGE);
    deploymentService.delete(tenantId, deploymentId);
    return ResponseEntity.noContent().build();
  }
}
