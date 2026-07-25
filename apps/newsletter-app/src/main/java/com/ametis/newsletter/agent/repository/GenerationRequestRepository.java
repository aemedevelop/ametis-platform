package com.ametis.newsletter.agent.repository;

import com.ametis.newsletter.agent.domain.GenerationRequest;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GenerationRequestRepository extends JpaRepository<GenerationRequest, UUID> {
  Optional<GenerationRequest> findByIdAndTenantId(UUID id, UUID tenantId);
  Optional<GenerationRequest> findByTenantIdAndExternalExecutionId(UUID tenantId, String externalExecutionId);
}
