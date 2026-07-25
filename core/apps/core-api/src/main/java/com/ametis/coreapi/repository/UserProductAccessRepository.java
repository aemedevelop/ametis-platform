package com.ametis.coreapi.repository;

import com.ametis.coreapi.domain.UserProductAccessEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserProductAccessRepository extends JpaRepository<UserProductAccessEntity, UUID> {
  List<UserProductAccessEntity> findByUser_Id(UUID userId);
  List<UserProductAccessEntity> findByTenantIdAndUser_Id(UUID tenantId, UUID userId);
  Optional<UserProductAccessEntity> findByTenantIdAndProduct_IdAndUser_Id(UUID tenantId, UUID productId, UUID userId);
}
