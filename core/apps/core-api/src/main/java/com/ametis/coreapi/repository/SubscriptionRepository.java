package com.ametis.coreapi.repository;

import com.ametis.coreapi.domain.SubscriptionEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubscriptionRepository extends JpaRepository<SubscriptionEntity, UUID> {
  Optional<SubscriptionEntity> findByTenantId(UUID tenantId);
}
