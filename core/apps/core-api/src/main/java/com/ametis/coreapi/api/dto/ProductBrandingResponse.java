package com.ametis.coreapi.api.dto;

import java.util.UUID;

public record ProductBrandingResponse(
    UUID id,
    String productCode,
    String logoUrl,
    String themeConfig,
    String primaryColor,
    String faviconUrl,
    String domainMode,
    Boolean customDomainEnabled) {
}
