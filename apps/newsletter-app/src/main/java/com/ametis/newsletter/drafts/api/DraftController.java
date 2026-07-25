package com.ametis.newsletter.drafts.api;

import com.ametis.newsletter.drafts.domain.Draft;
import com.ametis.newsletter.drafts.service.DraftService;
import com.ametis.newsletter.publications.api.PublicationResponse;
import com.ametis.newsletter.publications.api.ScheduleRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping
public class DraftController {
  private final DraftService draftService;

  public DraftController(DraftService draftService) {
    this.draftService = draftService;
  }

  @GetMapping("/api/newsletter/projects/{id}/drafts")
  public List<DraftResponse> list(@PathVariable UUID id) {
    return draftService.listByProject(id).stream().map(DraftResponse::from).toList();
  }

  @PostMapping("/api/newsletter/projects/{id}/drafts")
  @ResponseStatus(HttpStatus.CREATED)
  public DraftResponse create(@PathVariable UUID id, @Valid @RequestBody DraftRequest request) {
    Draft draft = toDomain(request);
    return DraftResponse.from(draftService.create(id, draft));
  }

  @GetMapping("/api/newsletter/drafts/{id}")
  public DraftResponse get(@PathVariable UUID id) {
    return DraftResponse.from(draftService.get(id));
  }

  @PutMapping("/api/newsletter/drafts/{id}")
  public DraftResponse update(@PathVariable UUID id, @Valid @RequestBody DraftRequest request) {
    return DraftResponse.from(draftService.update(id, toDomain(request)));
  }

  @PostMapping("/api/newsletter/drafts/{id}/approve")
  public DraftResponse approve(@PathVariable UUID id) {
    return DraftResponse.from(draftService.approve(id));
  }

  @PostMapping("/api/newsletter/drafts/{id}/reject")
  public DraftResponse reject(@PathVariable UUID id) {
    return DraftResponse.from(draftService.reject(id));
  }

  @PostMapping("/api/newsletter/drafts/{id}/schedule")
  public PublicationResponse schedule(@PathVariable UUID id, @Valid @RequestBody ScheduleRequest request) {
    return PublicationResponse.from(draftService.schedule(id, request.scheduledAt()));
  }

  @PostMapping("/api/newsletter/drafts/{id}/publish")
  public PublicationResponse publish(@PathVariable UUID id) {
    return PublicationResponse.from(draftService.publish(id));
  }

  private Draft toDomain(DraftRequest request) {
    Draft draft = new Draft();
    draft.setProposedTopic(request.proposedTopic());
    draft.setGeneratedTitle(request.generatedTitle());
    draft.setGeneratedSummary(request.generatedSummary());
    draft.setGeneratedContent(request.generatedContent());
    draft.setStatus(request.status());
    draft.setGenerationSource(request.generationSource());
    return draft;
  }
}
