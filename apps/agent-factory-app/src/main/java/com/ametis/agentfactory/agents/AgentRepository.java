package com.ametis.agentfactory.agents;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface AgentRepository extends JpaRepository<AgentDefinition, UUID> {
  List<AgentDefinition> findAllByBusinessIdOrderByUpdatedAtDesc(UUID businessId);
  Optional<AgentDefinition> findByIdAndBusinessId(UUID id, UUID businessId);
  Optional<AgentDefinition> findByIdAndTenantId(UUID id, UUID tenantId);
  Optional<AgentDefinition> findFirstByTenantIdAndStatusOrderByUpdatedAtDesc(UUID tenantId, AgentStatus status);
  boolean existsByBusinessIdAndNameIgnoreCase(UUID businessId, String name);
  boolean existsByBusinessIdAndNameIgnoreCaseAndIdNot(UUID businessId, String name, UUID id);
  long countByBusinessId(UUID businessId);

  @Modifying
  @Query("delete from AgentDefinition a where a.businessId = :businessId")
  int deleteByBusinessId(UUID businessId);
}
