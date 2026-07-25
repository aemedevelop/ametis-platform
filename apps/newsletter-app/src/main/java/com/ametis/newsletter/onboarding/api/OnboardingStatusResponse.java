package com.ametis.newsletter.onboarding.api;

import java.util.List;
import java.util.UUID;

public record OnboardingStatusResponse(
    boolean hasTenant,
    UUID activeTenantId,
    boolean hasNewsletterAccess,
    String roleCode,
    List<TenantSummary> tenants
) {
  public record TenantSummary(UUID id, String slug, String name, String status) {}
}
