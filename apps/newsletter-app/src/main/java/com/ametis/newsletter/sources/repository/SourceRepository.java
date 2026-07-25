package com.ametis.newsletter.sources.repository;

import com.ametis.newsletter.sources.domain.Source;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface SourceRepository extends JpaRepository<Source, UUID> {
  @Query("select s from Source s where s.tenantId = :tenantId order by s.createdAt desc")
  List<Source> findAllIncludingDeletedByTenantIdOrderByCreatedAtDesc(UUID tenantId);

  @Query("select s from Source s where s.tenantId = :tenantId and s.deletedAt is null order by s.createdAt desc")
  List<Source> findAllByTenantId(UUID tenantId);

  @Query("select s from Source s where s.tenantId = :tenantId and s.projectId = :projectId and s.deletedAt is null order by s.createdAt desc")
  List<Source> findAllByTenantIdAndProjectId(UUID tenantId, UUID projectId);

  @Query("select s from Source s where s.tenantId = :tenantId and s.projectId = :projectId and s.active = true and s.deletedAt is null order by s.createdAt desc")
  List<Source> findAllByTenantIdAndProjectIdAndActiveTrue(UUID tenantId, UUID projectId);

  @Query("select s from Source s where s.tenantId = :tenantId and s.projectId = :projectId and s.active = true and s.deletedAt is null and s.id in :ids order by s.createdAt desc")
  List<Source> findAllByTenantIdAndProjectIdAndActiveTrueAndIdIn(
      UUID tenantId,
      UUID projectId,
      Collection<UUID> ids);

  @Query("select s from Source s where s.id = :id and s.tenantId = :tenantId and s.deletedAt is null")
  Optional<Source> findByIdAndTenantId(UUID id, UUID tenantId);

  @Query("select s from Source s where s.id = :id and s.tenantId = :tenantId")
  Optional<Source> findByIdAndTenantIdIncludingDeleted(UUID id, UUID tenantId);
}
