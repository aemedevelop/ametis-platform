package com.ametis.newsletter.sources.service;

import com.ametis.newsletter.accessintegration.TenantContextHolder;
import com.ametis.newsletter.sources.domain.Source;
import com.ametis.newsletter.sources.repository.SourceRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SourceService {
  private final SourceRepository sourceRepository;

  public SourceService(SourceRepository sourceRepository) {
    this.sourceRepository = sourceRepository;
  }

  public List<Source> list(boolean includeDeleted) {
    UUID tenantId = TenantContextHolder.requireTenantId();
    if (includeDeleted) {
      return sourceRepository.findAllIncludingDeletedByTenantIdOrderByCreatedAtDesc(tenantId);
    }
    return sourceRepository.findAllByTenantId(tenantId);
  }

  public List<Source> listByProject(UUID projectId) {
    UUID tenantId = TenantContextHolder.requireTenantId();
    return sourceRepository.findAllByTenantIdAndProjectId(tenantId, projectId);
  }

  public Source create(UUID projectId, Source source) {
    UUID tenantId = TenantContextHolder.requireTenantId();
    source.setTenantId(tenantId);
    source.setProjectId(projectId);
    return sourceRepository.save(source);
  }

  public Source update(UUID id, Source updated) {
    UUID tenantId = TenantContextHolder.requireTenantId();
    Source existing = sourceRepository.findByIdAndTenantId(id, tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Source not found"));
    existing.setName(updated.getName());
    existing.setType(updated.getType());
    existing.setUrl(updated.getUrl());
    existing.setCategory(updated.getCategory());
    if (updated.getProjectId() != null) {
      existing.setProjectId(updated.getProjectId());
    }
    existing.setActive(updated.isActive());
    return sourceRepository.save(existing);
  }

  @Transactional
  public void delete(UUID id) {
    Source existing = get(id);
    if (existing.getDeletedAt() != null) {
      return;
    }
    existing.setDeletedAt(OffsetDateTime.now());
    existing.setDeletedBy(resolveCurrentUserId());
    sourceRepository.save(existing);
  }

  @Transactional
  public Source restore(UUID id) {
    UUID tenantId = TenantContextHolder.requireTenantId();
    Source existing =
        sourceRepository
            .findByIdAndTenantIdIncludingDeleted(id, tenantId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Source not found"));
    if (existing.getDeletedAt() == null) {
      return existing;
    }
    existing.setDeletedAt(null);
    existing.setDeletedBy(null);
    return sourceRepository.save(existing);
  }

  private Source get(UUID id) {
    UUID tenantId = TenantContextHolder.requireTenantId();
    return sourceRepository.findByIdAndTenantId(id, tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Source not found"));
  }

  private UUID resolveCurrentUserId() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null || !authentication.isAuthenticated()) {
      return null;
    }
    try {
      return UUID.fromString(authentication.getName());
    } catch (Exception ex) {
      return null;
    }
  }
}
