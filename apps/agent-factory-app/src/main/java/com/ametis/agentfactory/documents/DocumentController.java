package com.ametis.agentfactory.documents;

import com.ametis.agentfactory.access.AccessGuard;
import com.ametis.agentfactory.access.CorePlatformClient;
import java.util.UUID;
import jakarta.validation.Valid;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Repositorio documental a nivel de tenant (namespace + carpeta raíz en Drive).
 * Los documentos concretos se gestionan por base de conocimiento
 * ({@code /knowledge-bases/{id}/documents}).
 */
@RestController
@RequestMapping({"/v1", "/api/agent-factory"})
public class DocumentController {
  private final AccessGuard accessGuard;
  private final RepositoryProvisioningService provisioningService;

  public DocumentController(AccessGuard accessGuard, RepositoryProvisioningService provisioningService) {
    this.accessGuard = accessGuard;
    this.provisioningService = provisioningService;
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
}
