package com.ametis.newsletter.editorial.api;

import com.ametis.newsletter.editorial.domain.ProjectStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ProjectRequest(
    @NotBlank String name,
    String description,
    @NotBlank String language,
    String tone,
    String audience,
    @NotNull ProjectStatus status
) {
}
