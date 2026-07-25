package com.ametis.newsletter.accessintegration;

import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class CoreAuthorizationClient {
  private final RestClient restClient;
  private final String authorizationPath;
  private final String productAccessPathTemplate;

  public CoreAuthorizationClient(RestClient coreRestClient,
                                 @Value("${newsletter.core.authorization-path}") String authorizationPath,
                                 @Value("${newsletter.core.product-access-path-template}") String productAccessPathTemplate) {
    this.restClient = coreRestClient;
    this.authorizationPath = authorizationPath;
    this.productAccessPathTemplate = productAccessPathTemplate;
  }

  public AuthorizationResult checkAuthorization(String bearerToken, String tenantId, String permissionCode) {
    return restClient.post()
        .uri(authorizationPath)
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + bearerToken)
        .contentType(MediaType.APPLICATION_JSON)
        .body(Map.of("tenantId", tenantId, "permissionCode", permissionCode))
        .retrieve()
        .body(AuthorizationResult.class);
  }

  public ProductAccessResult checkProductAccess(String bearerToken, UUID tenantId, String productCode) {
    String resolved = productAccessPathTemplate
        .replace("{tenantId}", tenantId.toString())
        .replace("{productCode}", productCode);
    return restClient.get()
        .uri(resolved)
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + bearerToken)
        .retrieve()
        .body(ProductAccessResult.class);
  }

  public record AuthorizationResult(boolean allowed) {}
  public record ProductAccessResult(boolean allowed, String reason, String roleCode, String status) {}
}
