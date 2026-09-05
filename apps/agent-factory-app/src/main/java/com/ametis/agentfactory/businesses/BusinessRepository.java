package com.ametis.agentfactory.businesses;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BusinessRepository extends JpaRepository<Business, UUID> {
  List<Business> findAllByTenantIdOrderByNameAsc(UUID tenantId);
  Optional<Business> findByIdAndTenantId(UUID id, UUID tenantId);
  boolean existsByTenantIdAndNameIgnoreCase(UUID tenantId, String name);
  boolean existsByTenantIdAndNameIgnoreCaseAndIdNot(UUID tenantId, String name, UUID id);
  boolean existsByTenantIdAndSlug(UUID tenantId, String slug);
}
