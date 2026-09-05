package com.ametis.agentfactory.documents;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface DocumentAssetRepository extends JpaRepository<DocumentAsset, UUID> {
  Optional<DocumentAsset> findByKnowledgeBaseIdAndSha256(UUID knowledgeBaseId, String sha256);
  Optional<DocumentAsset> findByKnowledgeBaseIdAndDriveFileId(UUID knowledgeBaseId, String driveFileId);
  List<DocumentAsset> findAllByKnowledgeBaseIdOrderByCreatedAtDesc(UUID knowledgeBaseId);
  List<DocumentAsset> findAllByKnowledgeBaseIdIn(List<UUID> knowledgeBaseIds);
  long countByKnowledgeBaseIdAndStatus(UUID knowledgeBaseId, DocumentStatus status);
  long countByBusinessId(UUID businessId);
  void deleteAllByKnowledgeBaseId(UUID knowledgeBaseId);

  @Modifying
  @Query("delete from DocumentAsset d where d.businessId = :businessId")
  int deleteByBusinessId(UUID businessId);
}
