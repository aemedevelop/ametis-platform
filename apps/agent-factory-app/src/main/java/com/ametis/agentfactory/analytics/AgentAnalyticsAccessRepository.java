package com.ametis.agentfactory.analytics;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentAnalyticsAccessRepository extends JpaRepository<AgentAnalyticsAccess, UUID> {
  Optional<AgentAnalyticsAccess> findByTenantIdAndAgentId(UUID tenantId, UUID agentId);
  Optional<AgentAnalyticsAccess> findByPublicId(String publicId);
}
