package com.ametis.newsletter.publications.api;

import com.ametis.newsletter.publications.domain.Publication;
import com.ametis.newsletter.publications.service.PublicationService;
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
public class PublicationController {
  private final PublicationService publicationService;

  public PublicationController(PublicationService publicationService) {
    this.publicationService = publicationService;
  }

  @GetMapping({"/v1/projects/{projectId}/publications", "/api/newsletter/projects/{projectId}/publications"})
  public List<PublicationResponse> list(@PathVariable UUID projectId) {
    return publicationService.listByProject(projectId).stream().map(PublicationResponse::from).toList();
  }

  @PostMapping({"/v1/projects/{projectId}/publications", "/api/newsletter/projects/{projectId}/publications"})
  @ResponseStatus(HttpStatus.CREATED)
  public PublicationResponse create(@PathVariable UUID projectId, @Valid @RequestBody PublicationRequest request) {
    Publication publication = new Publication();
    publication.setTitle(request.title());
    publication.setSummary(request.summary());
    publication.setContent(request.content());
    publication.setStatus(request.status());
    publication.setVisibility(request.visibility());
    return PublicationResponse.from(publicationService.create(projectId, publication));
  }

  @GetMapping({"/v1/publications/{id}", "/api/newsletter/publications/{id}"})
  public PublicationResponse get(@PathVariable UUID id) {
    return PublicationResponse.from(publicationService.get(id));
  }

  @PutMapping({"/v1/publications/{id}", "/api/newsletter/publications/{id}"})
  public PublicationResponse update(@PathVariable UUID id, @Valid @RequestBody PublicationRequest request) {
    Publication publication = new Publication();
    publication.setTitle(request.title());
    publication.setSummary(request.summary());
    publication.setContent(request.content());
    publication.setStatus(request.status());
    publication.setVisibility(request.visibility());
    return PublicationResponse.from(publicationService.update(id, publication));
  }

  @PostMapping({"/v1/publications/{id}/schedule", "/api/newsletter/publications/{id}/schedule"})
  public PublicationResponse schedule(@PathVariable UUID id, @Valid @RequestBody ScheduleRequest request) {
    return PublicationResponse.from(publicationService.schedule(id, request.scheduledAt()));
  }

  @PostMapping({"/v1/publications/{id}/publish", "/api/newsletter/publications/{id}/publish"})
  public PublicationResponse publish(@PathVariable UUID id) {
    return PublicationResponse.from(publicationService.publish(id));
  }
}
