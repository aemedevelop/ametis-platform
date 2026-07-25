package com.ametis.coreapi.repository;

import com.ametis.coreapi.domain.UserTenantEntity;
import com.ametis.coreapi.domain.UserTenantId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserTenantRepository extends JpaRepository<UserTenantEntity, UserTenantId> {
  long countByIdUserId(UUID userId);

  List<UserTenantEntity> findByIdTenantId(UUID tenantId);

  Optional<UserTenantEntity> findByIdUserIdAndIdTenantId(UUID userId, UUID tenantId);
}
