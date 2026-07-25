package com.ametis.newsletter.agent.repository;

import com.ametis.newsletter.agent.domain.GenerationRequestSource;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GenerationRequestSourceRepository extends JpaRepository<GenerationRequestSource, UUID> {
  List<GenerationRequestSource> findAllByTenantIdAndGenerationRequestIdOrderByPriorityOrderAsc(UUID tenantId, UUID generationRequestId);
}
