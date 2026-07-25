package com.ametis.newsletter.editorial.repository;

import com.ametis.newsletter.editorial.domain.EditorialSettings;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EditorialSettingsRepository extends JpaRepository<EditorialSettings, UUID> {
  Optional<EditorialSettings> findByTenantIdAndProjectId(UUID tenantId, UUID projectId);
}
