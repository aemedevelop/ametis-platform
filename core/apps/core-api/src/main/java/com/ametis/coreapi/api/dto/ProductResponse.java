package com.ametis.coreapi.api.dto;

import java.time.Instant;
import java.util.UUID;

public record ProductResponse(
    UUID id,
    String code,
    String internalName,
    String publicName,
    String description,
    Boolean isStandalone,
    Boolean showPlatformBrand,
    String subdomain,
    Boolean isActive,
    Instant createdAt) {
}
