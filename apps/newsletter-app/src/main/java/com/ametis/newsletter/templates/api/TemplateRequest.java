package com.ametis.newsletter.templates.api;

import jakarta.validation.constraints.NotBlank;

public record TemplateRequest(
    @NotBlank String name,
    @NotBlank String structure,
    @NotBlank String styleConfig,
    Boolean isDefault
) {
}