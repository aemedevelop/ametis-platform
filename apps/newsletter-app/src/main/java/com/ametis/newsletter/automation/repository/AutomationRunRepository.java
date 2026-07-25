package com.ametis.newsletter.automation.repository;

import com.ametis.newsletter.automation.domain.AutomationRun;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AutomationRunRepository extends JpaRepository<AutomationRun, UUID> {
  List<AutomationRun> findAllByTenantIdAndProjectIdOrderByStartedAtDesc(UUID tenantId, UUID projectId);
  Optional<AutomationRun> findByTenantIdAndExternalExecutionId(UUID tenantId, String externalExecutionId);
}
