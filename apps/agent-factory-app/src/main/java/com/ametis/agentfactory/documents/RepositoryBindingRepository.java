package com.ametis.agentfactory.documents;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RepositoryBindingRepository extends JpaRepository<RepositoryBinding, UUID> {
  Optional<RepositoryBinding> findByTenantId(UUID tenantId);
}
