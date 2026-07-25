package com.ametis.coreapi.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CreateTenantRequest(
    @NotBlank String slug,
    @NotBlank String name,
    @NotBlank @Pattern(regexp = "PYME|CONSULTOR|PROVEEDOR|LEAD") String businessProfile) {
}
