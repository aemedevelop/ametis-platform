package com.ametis.agentfactory.agents;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentKnowledgeBaseRepository extends JpaRepository<AgentKnowledgeBase, UUID> {
  List<AgentKnowledgeBase> findAllByTenantIdAndAgentIdIn(UUID tenantId, Collection<UUID> agentIds);
  void deleteAllByTenantIdAndAgentId(UUID tenantId, UUID agentId);
}
