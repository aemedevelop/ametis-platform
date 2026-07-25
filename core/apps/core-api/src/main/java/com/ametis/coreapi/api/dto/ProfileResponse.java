package com.ametis.coreapi.api.dto;

import java.util.UUID;

public record ProfileResponse(
    UUID userId,
    String email,
    String fullName) {
}
