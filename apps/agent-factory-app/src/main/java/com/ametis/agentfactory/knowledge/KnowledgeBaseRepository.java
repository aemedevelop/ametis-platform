package com.ametis.agentfactory.knowledge;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface KnowledgeBaseRepository extends JpaRepository<KnowledgeBase, UUID> {
  List<KnowledgeBase> findAllByTenantIdOrderByUpdatedAtDesc(UUID tenantId);
  Optional<KnowledgeBase> findByIdAndTenantId(UUID id, UUID tenantId);
  List<KnowledgeBase> findAllByTenantIdAndIdIn(UUID tenantId, List<UUID> ids);
  boolean existsByTenantIdAndNameIgnoreCase(UUID tenantId, String name);
  boolean existsByTenantIdAndNameIgnoreCaseAndIdNot(UUID tenantId, String name, UUID id);
}
