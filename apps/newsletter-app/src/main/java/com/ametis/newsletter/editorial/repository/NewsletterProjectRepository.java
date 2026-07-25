package com.ametis.newsletter.editorial.repository;

import com.ametis.newsletter.editorial.domain.NewsletterProject;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface NewsletterProjectRepository extends JpaRepository<NewsletterProject, UUID> {
  @Query("select p from NewsletterProject p where p.tenantId = :tenantId order by p.createdAt desc")
  List<NewsletterProject> findAllIncludingDeletedByTenantIdOrderByCreatedAtDesc(UUID tenantId);

  @Query("select p from NewsletterProject p where p.tenantId = :tenantId and p.deletedAt is null order by p.createdAt desc")
  List<NewsletterProject> findActiveByTenantIdOrderByCreatedAtDesc(UUID tenantId);

  @Query("select p from NewsletterProject p where p.id = :id and p.tenantId = :tenantId and p.deletedAt is null")
  Optional<NewsletterProject> findByIdAndTenantId(UUID id, UUID tenantId);

  @Query("select p from NewsletterProject p where p.id = :id and p.tenantId = :tenantId")
  Optional<NewsletterProject> findByIdAndTenantIdIncludingDeleted(UUID id, UUID tenantId);

  @Query("select distinct p.tone from NewsletterProject p where p.tenantId = :tenantId and p.deletedAt is null and p.tone is not null and trim(p.tone) <> '' order by p.tone asc")
  List<String> findDistinctTonesByTenantId(UUID tenantId);

  @Query("select distinct p.audience from NewsletterProject p where p.tenantId = :tenantId and p.deletedAt is null and p.audience is not null and trim(p.audience) <> '' order by p.audience asc")
  List<String> findDistinctAudiencesByTenantId(UUID tenantId);
}
