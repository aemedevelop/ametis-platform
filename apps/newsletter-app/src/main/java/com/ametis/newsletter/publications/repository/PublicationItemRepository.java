package com.ametis.newsletter.publications.repository;

import com.ametis.newsletter.publications.domain.PublicationItem;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PublicationItemRepository extends JpaRepository<PublicationItem, UUID> {
  List<PublicationItem> findAllByTenantIdAndPublicationId(UUID tenantId, UUID publicationId);
}
