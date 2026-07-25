package com.ametis.newsletter.accessintegration;

import java.util.UUID;

public record AccessContext(UUID userId, String email, String fullName, UUID tenantId) {
}