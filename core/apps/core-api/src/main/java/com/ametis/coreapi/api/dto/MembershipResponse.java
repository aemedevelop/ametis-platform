package com.ametis.coreapi.api.dto;

import java.util.UUID;

public record MembershipResponse(UUID userId, UUID tenantId, String roleCode, String membershipStatus) {
}
