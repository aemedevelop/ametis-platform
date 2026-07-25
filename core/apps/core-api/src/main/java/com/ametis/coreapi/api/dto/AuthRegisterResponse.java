package com.ametis.coreapi.api.dto;

import java.util.UUID;

public record AuthRegisterResponse(
    UUID userId,
    String subject,
    String email,
    String fullName) {
}
