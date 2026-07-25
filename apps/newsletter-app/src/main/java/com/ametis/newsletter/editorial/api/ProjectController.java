package com.ametis.newsletter.editorial.api;

import com.ametis.newsletter.editorial.domain.NewsletterProject;
import com.ametis.newsletter.editorial.service.NewsletterProjectService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/v1/projects", "/api/newsletter/projects"})
public class ProjectController {
  private static final String DEFAULT_TONE = "PROFESIONAL";

  private final NewsletterProjectService projectService;

  public ProjectController(NewsletterProjectService projectService) {
    this.projectService = projectService;
  }

  @GetMapping
  public List<ProjectResponse> list(@RequestParam(defaultValue = "false") boolean includeDeleted) {
    return projectService.list(includeDeleted).stream().map(ProjectResponse::from).toList();
  }

  @GetMapping("/options")
  public ProjectFormOptionsResponse options() {
    return ProjectFormOptionsResponse.from(projectService.listFormOptions());
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ProjectResponse create(@Valid @RequestBody ProjectRequest request) {
    NewsletterProject project = new NewsletterProject();
    project.setName(request.name());
    project.setDescription(request.description());
    project.setLanguage(request.language());
    project.setTone(normalizeTone(request.tone()));
    project.setAudience(normalizeOptional(request.audience()));
    project.setStatus(request.status());
    return ProjectResponse.from(projectService.create(project));
  }

  @GetMapping("/{id}")
  public ProjectResponse get(@PathVariable UUID id) {
    return ProjectResponse.from(projectService.get(id));
  }

  @PutMapping("/{id}")
  public ProjectResponse update(@PathVariable UUID id, @Valid @RequestBody ProjectRequest request) {
    NewsletterProject project = new NewsletterProject();
    project.setName(request.name());
    project.setDescription(request.description());
    project.setLanguage(request.language());
    project.setTone(normalizeTone(request.tone()));
    project.setAudience(normalizeOptional(request.audience()));
    project.setStatus(request.status());
    return ProjectResponse.from(projectService.update(id, project));
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID id) {
    projectService.delete(id);
  }

  @PostMapping("/{id}/delete")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteViaPost(@PathVariable UUID id) {
    projectService.delete(id);
  }

  @PostMapping("/{id}/restore")
  public ProjectResponse restore(@PathVariable UUID id) {
    return ProjectResponse.from(projectService.restore(id));
  }

  private String normalizeTone(String value) {
    String normalized = normalizeOptional(value);
    return normalized == null ? DEFAULT_TONE : normalized;
  }

  private String normalizeOptional(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
