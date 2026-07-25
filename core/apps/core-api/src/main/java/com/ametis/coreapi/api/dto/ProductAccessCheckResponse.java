package com.ametis.coreapi.api.dto;

public record ProductAccessCheckResponse(
    boolean allowed,
    String reason,
    String roleCode,
    String status) {
}
