package com.ametis.newsletter.drafts.service;

import com.ametis.newsletter.accessintegration.TenantContextHolder;
import com.ametis.newsletter.drafts.domain.Draft;
import com.ametis.newsletter.drafts.domain.DraftStatus;
import com.ametis.newsletter.drafts.repository.DraftRepository;
import com.ametis.newsletter.publications.domain.Publication;
import com.ametis.newsletter.publications.service.PublicationService;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DraftService {
  private final DraftRepository draftRepository;
  private final PublicationService publicationService;

  public DraftService(DraftRepository draftRepository, PublicationService publicationService) {
    this.draftRepository = draftRepository;
    this.publicationService = publicationService;
  }

  public List<Draft> listByProject(UUID projectId) {
    UUID tenantId = TenantContextHolder.requireTenantId();
    return draftRepository.findAllByTenantIdAndProjectIdOrderByCreatedAtDesc(tenantId, projectId);
  }

  public Draft get(UUID id) {
    UUID tenantId = TenantContextHolder.requireTenantId();
    return draftRepository.findByIdAndTenantId(id, tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Draft not found"));
  }

  public Draft create(UUID projectId, Draft payload) {
    UUID tenantId = TenantContextHolder.requireTenantId();
    payload.setTenantId(tenantId);
    payload.setProjectId(projectId);
    if (payload.getStatus() == null) {
      payload.setStatus(DraftStatus.GENERATED);
    }
    return draftRepository.save(payload);
  }

  public Draft update(UUID id, Draft payload) {
    Draft existing = get(id);
    existing.setProposedTopic(payload.getProposedTopic());
    existing.setGeneratedTitle(payload.getGeneratedTitle());
    existing.setGeneratedSummary(payload.getGeneratedSummary());
    existing.setGeneratedContent(payload.getGeneratedContent());
    existing.setStatus(payload.getStatus());
    existing.setGenerationSource(payload.getGenerationSource());
    return draftRepository.save(existing);
  }

  public Draft approve(UUID id) {
    Draft draft = get(id);
    draft.setStatus(DraftStatus.APPROVED);
    return draftRepository.save(draft);
  }

  public Draft reject(UUID id) {
    Draft draft = get(id);
    draft.setStatus(DraftStatus.REJECTED);
    return draftRepository.save(draft);
  }

  public Publication schedule(UUID id, OffsetDateTime scheduledAt) {
    Draft draft = approve(id);
    draft.setStatus(DraftStatus.SCHEDULED);
    draftRepository.save(draft);
    return publicationService.createFromDraft(
        draft.getProjectId(),
        draft.getId(),
        draft.getGeneratedTitle(),
        draft.getGeneratedSummary(),
        draft.getGeneratedContent(),
        scheduledAt,
        false);
  }

  public Publication publish(UUID id) {
    Draft draft = approve(id);
    draft.setStatus(DraftStatus.PUBLISHED);
    draftRepository.save(draft);
    return publicationService.createFromDraft(
        draft.getProjectId(),
        draft.getId(),
        draft.getGeneratedTitle(),
        draft.getGeneratedSummary(),
        draft.getGeneratedContent(),
        OffsetDateTime.now(),
        true);
  }
}
