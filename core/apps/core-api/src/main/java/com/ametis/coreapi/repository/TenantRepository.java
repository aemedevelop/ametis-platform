package com.ametis.coreapi.repository;

import com.ametis.coreapi.domain.TenantEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TenantRepository extends JpaRepository<TenantEntity, UUID> {
  boolean existsBySlug(String slug);

  @Query("select t from TenantEntity t join UserTenantEntity ut on ut.id.tenantId = t.id where ut.id.userId = :userId")
  List<TenantEntity> findAllByUserId(@Param("userId") UUID userId);
}
