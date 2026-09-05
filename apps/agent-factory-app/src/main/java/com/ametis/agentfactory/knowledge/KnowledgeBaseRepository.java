package com.ametis.agentfactory.knowledge;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface KnowledgeBaseRepository extends JpaRepository<KnowledgeBase, UUID> {
  List<KnowledgeBase> findAllByBusinessIdOrderByUpdatedAtDesc(UUID businessId);
  Optional<KnowledgeBase> findByIdAndBusinessId(UUID id, UUID businessId);
  List<KnowledgeBase> findAllByBusinessId(UUID businessId);
  List<KnowledgeBase> findAllByBusinessIdAndIdIn(UUID businessId, List<UUID> ids);
  List<KnowledgeBase> findAllByTenantIdAndIdIn(UUID tenantId, List<UUID> ids);
  boolean existsByBusinessIdAndNameIgnoreCase(UUID businessId, String name);
  boolean existsByBusinessIdAndNameIgnoreCaseAndIdNot(UUID businessId, String name, UUID id);
  long countByBusinessId(UUID businessId);

  @Modifying
  @Query("delete from KnowledgeBase kb where kb.businessId = :businessId")
  int deleteByBusinessId(UUID businessId);
}
