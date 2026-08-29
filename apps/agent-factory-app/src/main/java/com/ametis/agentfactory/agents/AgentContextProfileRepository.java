package com.ametis.agentfactory.agents;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentContextProfileRepository extends JpaRepository<AgentContextProfile, UUID> {
  List<AgentContextProfile> findAllByTenantIdAndAgentIdIn(UUID tenantId, List<UUID> agentIds);
  Optional<AgentContextProfile> findByAgentIdAndTenantId(UUID agentId, UUID tenantId);
  void deleteByAgentIdAndTenantId(UUID agentId, UUID tenantId);
}

