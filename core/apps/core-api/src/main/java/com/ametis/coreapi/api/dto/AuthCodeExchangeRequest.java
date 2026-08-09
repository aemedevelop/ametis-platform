package com.ametis.coreapi.api.dto;

import jakarta.validation.constraints.NotBlank;

public record AuthCodeExchangeRequest(
    @NotBlank String clientId,
    @NotBlank String code,
    @NotBlank String redirectUri,
    String codeVerifier) {
}
