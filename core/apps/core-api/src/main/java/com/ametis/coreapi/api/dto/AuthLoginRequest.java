package com.ametis.coreapi.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AuthLoginRequest(
    @NotBlank @Size(max = 320) String username,
    @NotBlank @Size(max = 120) String password) {
}
