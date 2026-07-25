package com.ametis.newsletter.sources.api;

import com.ametis.newsletter.sources.domain.SourceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SourceRequest(
    @NotBlank String name,
    @NotNull SourceType type,
    @NotBlank String url,
    String category,
    Boolean active
) {
}
