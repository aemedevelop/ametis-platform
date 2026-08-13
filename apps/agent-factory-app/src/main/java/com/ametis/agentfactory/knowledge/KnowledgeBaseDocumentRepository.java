package com.ametis.agentfactory.knowledge;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface KnowledgeBaseDocumentRepository extends JpaRepository<KnowledgeBaseDocument, UUID> {
  List<KnowledgeBaseDocument> findAllByTenantIdAndKnowledgeBaseIdIn(UUID tenantId, Collection<UUID> knowledgeBaseIds);
  List<KnowledgeBaseDocument> findAllByTenantIdAndKnowledgeBaseId(UUID tenantId, UUID knowledgeBaseId);
  void deleteAllByTenantIdAndKnowledgeBaseId(UUID tenantId, UUID knowledgeBaseId);
}
