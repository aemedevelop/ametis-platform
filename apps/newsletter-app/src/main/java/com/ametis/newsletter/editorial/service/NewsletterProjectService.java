package com.ametis.newsletter.editorial.service;

import com.ametis.newsletter.accessintegration.TenantContextHolder;
import com.ametis.newsletter.editorial.domain.NewsletterProject;
import com.ametis.newsletter.editorial.repository.NewsletterProjectRepository;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class NewsletterProjectService {
  private static final List<String> DEFAULT_TONES = List.of("PROFESIONAL", "EJECUTIVO", "ANALÍTICO");
  private static final List<String> DEFAULT_AUDIENCES = List.of("PYMES", "CORPORATIVO", "STARTUPS");

  private final NewsletterProjectRepository projectRepository;

  public NewsletterProjectService(NewsletterProjectRepository projectRepository) {
    this.projectRepository = projectRepository;
  }

  public List<NewsletterProject> list(boolean includeDeleted) {
    UUID tenantId = TenantContextHolder.requireTenantId();
    if (includeDeleted) {
      return projectRepository.findAllIncludingDeletedByTenantIdOrderByCreatedAtDesc(tenantId);
    }
    return projectRepository.findActiveByTenantIdOrderByCreatedAtDesc(tenantId);
  }

  public NewsletterProject get(UUID id) {
    UUID tenantId = TenantContextHolder.requireTenantId();
    return projectRepository.findByIdAndTenantId(id, tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
  }

  public NewsletterProject create(NewsletterProject project) {
    UUID tenantId = TenantContextHolder.requireTenantId();
    project.setTenantId(tenantId);
    return projectRepository.save(project);
  }

  public NewsletterProject update(UUID id, NewsletterProject updated) {
    NewsletterProject existing = get(id);
    existing.setName(updated.getName());
    existing.setDescription(updated.getDescription());
    existing.setLanguage(updated.getLanguage());
    existing.setTone(updated.getTone());
    existing.setAudience(updated.getAudience());
    existing.setStatus(updated.getStatus());
    return projectRepository.save(existing);
  }

  @Transactional
  public void delete(UUID id) {
    NewsletterProject existing = get(id);
    if (existing.getDeletedAt() != null) {
      return;
    }
    existing.setDeletedAt(OffsetDateTime.now());
    existing.setDeletedBy(resolveCurrentUserId());
    projectRepository.save(existing);
  }

  @Transactional
  public NewsletterProject restore(UUID id) {
    UUID tenantId = TenantContextHolder.requireTenantId();
    NewsletterProject existing =
        projectRepository
            .findByIdAndTenantIdIncludingDeleted(id, tenantId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
    if (existing.getDeletedAt() == null) {
      return existing;
    }
    existing.setDeletedAt(null);
    existing.setDeletedBy(null);
    return projectRepository.save(existing);
  }

  public ProjectFormOptions listFormOptions() {
    UUID tenantId = TenantContextHolder.requireTenantId();

    List<String> tones = new ArrayList<>(projectRepository.findDistinctTonesByTenantId(tenantId));
    for (String tone : DEFAULT_TONES) {
      if (!tones.contains(tone)) {
        tones.add(tone);
      }
    }

    List<String> audiences = new ArrayList<>(projectRepository.findDistinctAudiencesByTenantId(tenantId));
    for (String audience : DEFAULT_AUDIENCES) {
      if (!audiences.contains(audience)) {
        audiences.add(audience);
      }
    }

    return new ProjectFormOptions(tones, audiences);
  }

  public record ProjectFormOptions(List<String> tones, List<String> audiences) {}

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
