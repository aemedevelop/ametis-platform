package com.ametis.coreapi.api.dto;

import java.util.UUID;

public record TenantResponse(UUID id, String slug, String name, String businessProfile, String status) {
}
