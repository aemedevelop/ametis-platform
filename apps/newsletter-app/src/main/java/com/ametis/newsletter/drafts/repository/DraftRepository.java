package com.ametis.newsletter.drafts.repository;

import com.ametis.newsletter.drafts.domain.Draft;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DraftRepository extends JpaRepository<Draft, UUID> {
  List<Draft> findAllByTenantIdAndProjectIdOrderByCreatedAtDesc(UUID tenantId, UUID projectId);
  Optional<Draft> findByIdAndTenantId(UUID id, UUID tenantId);
  Optional<Draft> findByTenantIdAndGenerationRequestId(UUID tenantId, UUID generationRequestId);
}
