package com.ametis.newsletter.accessintegration;

import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccessIntegrationService {
  public static final String DEFAULT_PERMISSION = "newsletter.access";
  public static final String DEFAULT_PRODUCT_CODE = "newsletter";

  private final CoreAuthorizationClient coreAuthorizationClient;
  private final String productCode;

  public AccessIntegrationService(
      CoreAuthorizationClient coreAuthorizationClient,
      @Value("${newsletter.product.code:" + DEFAULT_PRODUCT_CODE + "}") String productCode) {
    this.coreAuthorizationClient = coreAuthorizationClient;
    this.productCode = productCode;
  }

  public AccessContext getContext() {
    Jwt jwt = getJwt();
    UUID userId = parseUuid(jwt.getSubject());
    String email = String.valueOf(jwt.getClaims().getOrDefault("email", ""));
    String fullName = String.valueOf(jwt.getClaims().getOrDefault("name", email));
    UUID tenantId = TenantContextHolder.getTenantId();
    return new AccessContext(userId, email, fullName, tenantId);
  }

  public AccessDecision checkAccess(String permissionCode) {
    Jwt jwt = getJwt();
    UUID tenantId = TenantContextHolder.requireTenantId();
    String tokenValue = jwt.getTokenValue();

    try {
      CoreAuthorizationClient.AuthorizationResult authz = coreAuthorizationClient.checkAuthorization(
          tokenValue,
          tenantId.toString(),
          permissionCode
      );
      CoreAuthorizationClient.ProductAccessResult product = coreAuthorizationClient.checkProductAccess(
          tokenValue,
          tenantId,
          productCode
      );
      boolean permissionAllowed = authz != null && authz.allowed();
      boolean productAllowed = product != null && product.allowed();
      boolean allowed = permissionAllowed && productAllowed;
      return new AccessDecision(
          permissionCode,
          allowed,
          productCode,
          productAllowed,
          product == null ? null : product.roleCode(),
          product == null ? null : product.status(),
          allowed ? null : "not_allowed"
      );
    } catch (Exception ex) {
      return new AccessDecision(permissionCode, false, productCode, false, null, null, "core_unreachable");
    }
  }

  private Jwt getJwt() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (!(auth instanceof JwtAuthenticationToken jwtAuth)) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing JWT token");
    }
    return jwtAuth.getToken();
  }

  private UUID parseUuid(String raw) {
    if (raw == null || raw.isBlank()) return null;
    try {
      return UUID.fromString(raw);
    } catch (IllegalArgumentException ex) {
      return null;
    }
  }

  public record AccessDecision(
      String permissionCode,
      boolean allowed,
      String productCode,
      boolean productAccess,
      String roleCode,
      String accessStatus,
      String reason) {}
}
