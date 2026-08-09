package com.ametis.agentfactory.access;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class CorePlatformClient {
  private final RestClient restClient;
  private final String authorizationPath;
  private final String productAccessPathTemplate;
  private final String tenantsPath;
  private final String productCode;

  public CorePlatformClient(
      RestClient coreRestClient,
      @Value("${agent-factory.core.authorization-path}") String authorizationPath,
      @Value("${agent-factory.core.product-access-path-template}") String productAccessPathTemplate,
      @Value("${agent-factory.core.tenants-path}") String tenantsPath,
      @Value("${agent-factory.product.code}") String productCode) {
    this.restClient = coreRestClient;
    this.authorizationPath = authorizationPath;
    this.productAccessPathTemplate = productAccessPathTemplate;
    this.tenantsPath = tenantsPath;
    this.productCode = productCode;
  }

  public AuthorizationResult checkAuthorization(String token, UUID tenantId, String permissionCode) {
    return restClient.post()
        .uri(authorizationPath)
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
        .contentType(MediaType.APPLICATION_JSON)
        .body(Map.of("tenantId", tenantId.toString(), "permissionCode", permissionCode))
        .retrieve()
        .body(AuthorizationResult.class);
  }

  public ProductAccessResult checkProductAccess(String token, UUID tenantId) {
    String path = productAccessPathTemplate
        .replace("{tenantId}", tenantId.toString())
        .replace("{productCode}", productCode);
    return restClient.get()
        .uri(path)
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
        .retrieve()
        .body(ProductAccessResult.class);
  }

  public List<TenantDto> listTenants(String token) {
    TenantDto[] response = restClient.get()
        .uri(tenantsPath)
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
        .retrieve()
        .body(TenantDto[].class);
    return response == null ? List.of() : List.of(response);
  }

  public record AuthorizationResult(boolean allowed) {}
  public record ProductAccessResult(boolean allowed, String reason, String roleCode, String status) {}
  public record TenantDto(UUID id, String slug, String name, String businessProfile, String status) {}
}
