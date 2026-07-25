package com.ametis.coreapi.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AuthorizationCheckRequest(
    @NotNull UUID tenantId,
    @NotBlank String permissionCode) {
}
