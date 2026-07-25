package com.ametis.newsletter.onboarding.service;

import com.ametis.newsletter.accessintegration.TenantContextHolder;
import com.ametis.newsletter.onboarding.api.OnboardingStartRequest;
import com.ametis.newsletter.onboarding.api.OnboardingStatusResponse;
import com.ametis.newsletter.onboarding.core.CoreOnboardingClient;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class OnboardingService {
  private final CoreOnboardingClient coreOnboardingClient;

  public OnboardingService(CoreOnboardingClient coreOnboardingClient) {
    this.coreOnboardingClient = coreOnboardingClient;
  }

  public OnboardingStatusResponse status(String bearerToken) {
    UUID activeTenantId = TenantContextHolder.getTenantId();
    List<CoreOnboardingClient.TenantDto> tenants = coreOnboardingClient.listTenants(bearerToken);
    boolean hasTenant = !tenants.isEmpty();
    CoreOnboardingClient.ProductAccessDto access = null;
    if (activeTenantId != null) {
      access = coreOnboardingClient.checkProductAccess(bearerToken, activeTenantId);
    }
    return new OnboardingStatusResponse(
        hasTenant,
        activeTenantId,
        access != null && access.allowed(),
        access == null ? null : access.roleCode(),
        tenants.stream()
            .map(t -> new OnboardingStatusResponse.TenantSummary(t.id(), t.slug(), t.name(), t.status()))
            .toList());
  }

  public OnboardingStatusResponse start(String bearerToken, OnboardingStartRequest request) {
    coreOnboardingClient.createTenant(
        bearerToken,
        new CoreOnboardingClient.CreateTenantDto(
            request.tenantSlug().trim().toLowerCase(),
            request.tenantName().trim(),
            request.businessProfile() == null ? "GENERAL" : request.businessProfile().trim().toUpperCase()));
    return status(bearerToken);
  }
}
