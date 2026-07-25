package com.ametis.coreapi.api.dto;

public record AuthLoginResponse(
    String accessToken,
    String refreshToken,
    String tokenType,
    Long expiresIn,
    Long refreshExpiresIn,
    String scope) {
}
