package com.ametis.coreapi.api.dto;

import java.time.Instant;
import java.util.UUID;

public record UserProductAccessResponse(
    UUID userId,
    UUID tenantId,
    String productCode,
    String roleCode,
    String status,
    Instant grantedAt) {
}
