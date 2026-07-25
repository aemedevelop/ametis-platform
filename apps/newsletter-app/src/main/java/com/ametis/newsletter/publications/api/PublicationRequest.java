package com.ametis.newsletter.publications.api;

import com.ametis.newsletter.publications.domain.PublicationStatus;
import com.ametis.newsletter.publications.domain.PublicationVisibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PublicationRequest(
    @NotBlank String title,
    String summary,
    String content,
    @NotNull PublicationStatus status,
    PublicationVisibility visibility
) {
}
