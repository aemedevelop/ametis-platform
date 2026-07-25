package com.ametis.newsletter.templates.repository;

import com.ametis.newsletter.templates.domain.Template;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TemplateRepository extends JpaRepository<Template, UUID> {
  List<Template> findAllByTenantIdAndProjectId(UUID tenantId, UUID projectId);
  Optional<Template> findByIdAndTenantId(UUID id, UUID tenantId);
}
