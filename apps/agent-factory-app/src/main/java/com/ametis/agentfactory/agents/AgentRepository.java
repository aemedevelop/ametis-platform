package com.ametis.agentfactory.agents;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentRepository extends JpaRepository<AgentDefinition, UUID> {
  List<AgentDefinition> findAllByTenantIdOrderByUpdatedAtDesc(UUID tenantId);
  Optional<AgentDefinition> findByIdAndTenantId(UUID id, UUID tenantId);
  boolean existsByTenantIdAndNameIgnoreCase(UUID tenantId, String name);
  boolean existsByTenantIdAndNameIgnoreCaseAndIdNot(UUID tenantId, String name, UUID id);
}
