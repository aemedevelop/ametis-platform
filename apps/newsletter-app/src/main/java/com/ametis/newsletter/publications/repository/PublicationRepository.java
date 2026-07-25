package com.ametis.newsletter.publications.repository;

import com.ametis.newsletter.publications.domain.Publication;
import com.ametis.newsletter.publications.domain.PublicationStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PublicationRepository extends JpaRepository<Publication, UUID> {
  List<Publication> findAllByTenantIdAndProjectId(UUID tenantId, UUID projectId);
  List<Publication> findAllByProjectIdAndStatusOrderByPublishedAtDesc(UUID projectId, PublicationStatus status);
  Optional<Publication> findFirstBySlugAndStatusOrderByPublishedAtDesc(String slug, PublicationStatus status);
  boolean existsByTenantIdAndSlug(UUID tenantId, String slug);
  Optional<Publication> findByIdAndTenantId(UUID id, UUID tenantId);
}
