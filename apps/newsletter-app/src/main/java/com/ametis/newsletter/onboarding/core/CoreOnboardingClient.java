package com.ametis.newsletter.onboarding.core;

import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class CoreOnboardingClient {
  private final RestClient restClient;
  private final String tenantsPath;
  private final String productAccessPathTemplate;
  private final String productCode;

  public CoreOnboardingClient(
      RestClient coreRestClient,
      @Value("${newsletter.core.tenants-path}") String tenantsPath,
      @Value("${newsletter.core.product-access-path-template}") String productAccessPathTemplate,
      @Value("${newsletter.product.code:newsletter}") String productCode) {
    this.restClient = coreRestClient;
    this.tenantsPath = tenantsPath;
    this.productAccessPathTemplate = productAccessPathTemplate;
    this.productCode = productCode;
  }

  public List<TenantDto> listTenants(String bearerToken) {
    TenantDto[] response = restClient.get()
        .uri(tenantsPath)
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + bearerToken)
        .retrieve()
        .body(TenantDto[].class);
    return response == null ? List.of() : List.of(response);
  }

  public TenantDto createTenant(String bearerToken, CreateTenantDto request) {
    return restClient.post()
        .uri(tenantsPath)
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + bearerToken)
        .contentType(MediaType.APPLICATION_JSON)
        .body(request)
        .retrieve()
        .body(TenantDto.class);
  }

  public ProductAccessDto checkProductAccess(String bearerToken, UUID tenantId) {
    String path = productAccessPathTemplate
        .replace("{tenantId}", tenantId.toString())
        .replace("{productCode}", productCode);
    return restClient.get()
        .uri(path)
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + bearerToken)
        .retrieve()
        .body(ProductAccessDto.class);
  }

  public record TenantDto(UUID id, String slug, String name, String businessProfile, String status) {}
  public record CreateTenantDto(String slug, String name, String businessProfile) {}
  public record ProductAccessDto(boolean allowed, String reason, String roleCode, String status) {}
}
