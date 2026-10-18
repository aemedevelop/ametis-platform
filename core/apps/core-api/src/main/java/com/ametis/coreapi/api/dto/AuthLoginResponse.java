package com.ametis.coreapi.api.dto;

public record AuthLoginResponse(
    String accessToken,
    String refreshToken,
    String tokenType,
    Long expiresIn,
    Long refreshExpiresIn,
    String scope,
    // Necesario como id_token_hint para cerrar la sesión SSO en Keycloak.
    String idToken) {
}
