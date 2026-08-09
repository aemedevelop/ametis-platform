package com.ametis.agentfactory.documents;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentAssetRepository extends JpaRepository<DocumentAsset, UUID> {
  Optional<DocumentAsset> findByTenantIdAndSha256(UUID tenantId, String sha256);
  Optional<DocumentAsset> findByTenantIdAndDriveFileId(UUID tenantId, String driveFileId);
  List<DocumentAsset> findAllByTenantIdOrderByCreatedAtDesc(UUID tenantId);
}
