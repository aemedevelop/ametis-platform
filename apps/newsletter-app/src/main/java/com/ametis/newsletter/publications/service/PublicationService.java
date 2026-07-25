package com.ametis.newsletter.publications.service;

import com.ametis.newsletter.accessintegration.TenantContextHolder;
import com.ametis.newsletter.publications.domain.Publication;
import com.ametis.newsletter.publications.domain.PublicationStatus;
import com.ametis.newsletter.publications.domain.PublicationVisibility;
import com.ametis.newsletter.publications.repository.PublicationRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PublicationService {
  private static final Pattern NON_ALNUM = Pattern.compile("[^a-z0-9]+");

  private final PublicationRepository publicationRepository;

  public PublicationService(PublicationRepository publicationRepository) {
    this.publicationRepository = publicationRepository;
  }

  public List<Publication> listByProject(UUID projectId) {
    UUID tenantId = TenantContextHolder.requireTenantId();
    return publicationRepository.findAllByTenantIdAndProjectId(tenantId, projectId);
  }

  public Publication get(UUID id) {
    UUID tenantId = TenantContextHolder.requireTenantId();
    return publicationRepository.findByIdAndTenantId(id, tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Publication not found"));
  }

  public Publication create(UUID projectId, Publication publication) {
    UUID tenantId = TenantContextHolder.requireTenantId();
    publication.setTenantId(tenantId);
    publication.setProjectId(projectId);
    if (publication.getVisibility() == null) {
      publication.setVisibility(PublicationVisibility.PRIVATE);
    }
    publication.setSlug(uniqueSlug(tenantId, publication.getTitle()));
    return publicationRepository.save(publication);
  }

  public Publication update(UUID id, Publication updated) {
    Publication existing = get(id);
    existing.setTitle(updated.getTitle());
    existing.setSummary(updated.getSummary());
    existing.setContent(updated.getContent());
    existing.setStatus(updated.getStatus());
    if (updated.getVisibility() != null) {
      existing.setVisibility(updated.getVisibility());
    }
    if (updated.getTitle() != null && !updated.getTitle().isBlank()) {
      existing.setSlug(uniqueSlug(existing.getTenantId(), updated.getTitle()));
    }
    return publicationRepository.save(existing);
  }

  public Publication schedule(UUID id, OffsetDateTime scheduledAt) {
    Publication existing = get(id);
    existing.setStatus(PublicationStatus.SCHEDULED);
    existing.setScheduledAt(scheduledAt);
    return publicationRepository.save(existing);
  }

  public Publication publish(UUID id) {
    Publication existing = get(id);
    existing.setStatus(PublicationStatus.PUBLISHED);
    existing.setPublishedAt(OffsetDateTime.now());
    if (existing.getSlug() == null || existing.getSlug().isBlank()) {
      existing.setSlug(uniqueSlug(existing.getTenantId(), existing.getTitle()));
    }
    return publicationRepository.save(existing);
  }

  public List<Publication> listPublishedForViewer(UUID projectId) {
    return publicationRepository.findAllByProjectIdAndStatusOrderByPublishedAtDesc(projectId, PublicationStatus.PUBLISHED);
  }

  public Publication getPublishedBySlug(String slug) {
    return publicationRepository.findFirstBySlugAndStatusOrderByPublishedAtDesc(slug, PublicationStatus.PUBLISHED)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Publication not found"));
  }

  public Publication createFromDraft(
      UUID projectId,
      UUID draftId,
      String title,
      String summary,
      String content,
      OffsetDateTime scheduledAt,
      boolean publishNow) {
    UUID tenantId = TenantContextHolder.requireTenantId();
    Publication publication = new Publication();
    publication.setTenantId(tenantId);
    publication.setProjectId(projectId);
    publication.setTitle(title);
    publication.setSummary(summary);
    publication.setContent(content);
    publication.setCreatedFromDraftId(draftId);
    publication.setVisibility(PublicationVisibility.PRIVATE);
    publication.setSlug(uniqueSlug(tenantId, title));
    if (publishNow) {
      publication.setStatus(PublicationStatus.PUBLISHED);
      publication.setPublishedAt(OffsetDateTime.now());
    } else {
      publication.setStatus(PublicationStatus.SCHEDULED);
      publication.setScheduledAt(scheduledAt);
    }
    return publicationRepository.save(publication);
  }

  private String uniqueSlug(UUID tenantId, String title) {
    String base = slugify(title);
    if (!publicationRepository.existsByTenantIdAndSlug(tenantId, base)) {
      return base;
    }
    int suffix = 2;
    String candidate = base + "-" + suffix;
    while (publicationRepository.existsByTenantIdAndSlug(tenantId, candidate)) {
      suffix++;
      candidate = base + "-" + suffix;
    }
    return candidate;
  }

  private String slugify(String input) {
    if (input == null || input.isBlank()) {
      return "publication-" + System.currentTimeMillis();
    }
    String lowered = input.toLowerCase().trim();
    String slug = NON_ALNUM.matcher(lowered).replaceAll("-");
    slug = slug.replaceAll("(^-+|-+$)", "");
    return slug.isBlank() ? "publication-" + System.currentTimeMillis() : slug;
  }
}
