package com.ametis.newsletter.onboarding.api;

import jakarta.validation.constraints.NotBlank;

public record OnboardingStartRequest(
    @NotBlank String tenantSlug,
    @NotBlank String tenantName,
    String businessProfile
) {
}
