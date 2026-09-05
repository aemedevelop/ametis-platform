package com.ametis.agentfactory.access;

import com.ametis.agentfactory.businesses.BusinessContextHolder;
import com.ametis.agentfactory.tenant.TenantContextHolder;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccessGuard {
  public static final String DOCUMENTS_READ = "ia.documents.read";
  public static final String DOCUMENTS_MANAGE = "ia.documents.manage";

  private final CorePlatformClient corePlatformClient;

  public AccessGuard(CorePlatformClient corePlatformClient) {
    this.corePlatformClient = corePlatformClient;
  }

  public UUID requireAccess(JwtAuthenticationToken authentication, String permission) {
    UUID tenantId = TenantContextHolder.requireTenantId();
    String token = authentication.getToken().getTokenValue();
    try {
      CorePlatformClient.AuthorizationResult authorization =
          corePlatformClient.checkAuthorization(token, tenantId, permission);
      CorePlatformClient.ProductAccessResult productAccess =
          corePlatformClient.checkProductAccess(token, tenantId);
      if (authorization == null || !authorization.allowed() || productAccess == null || !productAccess.allowed()) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Agent Factory access denied");
      }
      return tenantId;
    } catch (ResponseStatusException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Core authorization unavailable", exception);
    }
  }

  public CorePlatformClient.TenantDto requireTenant(JwtAuthenticationToken authentication, UUID tenantId) {
    String token = authentication.getToken().getTokenValue();
    return corePlatformClient.listTenants(token).stream()
        .filter(tenant -> tenant.id().equals(tenantId))
        .findFirst()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Tenant membership not found"));
  }

  /** Negocio activo de la petición (cabecera X-Business-Id). Su pertenencia al tenant la valida BusinessService. */
  public UUID requireBusinessId() {
    return BusinessContextHolder.requireBusinessId();
  }

  public UUID currentUserId(JwtAuthenticationToken authentication) {
    try {
      return UUID.fromString(authentication.getName());
    } catch (IllegalArgumentException exception) {
      return null;
    }
  }
}
