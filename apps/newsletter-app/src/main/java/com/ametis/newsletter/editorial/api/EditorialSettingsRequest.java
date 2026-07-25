package com.ametis.newsletter.editorial.api;

import jakarta.validation.constraints.NotBlank;

public record EditorialSettingsRequest(
    String preferredTopic,
    @NotBlank String writingStyle,
    @NotBlank String tone,
    @NotBlank String articleLength,
    @NotBlank String audience,
    Boolean includeSummary,
    Boolean includeCta
) {
}
