package com.ametis.coreapi.repository.authorization;

import java.util.UUID;

public interface AuthorizationRepository {
  int countAuthorizationMatches(UUID userId, UUID tenantId, String permissionCode);
}
