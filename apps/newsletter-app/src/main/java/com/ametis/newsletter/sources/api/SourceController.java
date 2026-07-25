package com.ametis.newsletter.sources.api;

import com.ametis.newsletter.sources.domain.Source;
import com.ametis.newsletter.sources.service.SourceService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SourceController {
  private final SourceService sourceService;

  public SourceController(SourceService sourceService) {
    this.sourceService = sourceService;
  }

  @GetMapping({"/v1/sources", "/api/newsletter/sources"})
  public List<SourceResponse> list(@RequestParam(defaultValue = "false") boolean includeDeleted) {
    return sourceService.list(includeDeleted).stream().map(SourceResponse::from).toList();
  }

  @GetMapping({"/api/newsletter/projects/{id}/sources", "/v1/projects/{id}/sources"})
  public List<SourceResponse> listByProject(@PathVariable UUID id) {
    return sourceService.listByProject(id).stream().map(SourceResponse::from).toList();
  }

  @PostMapping({"/api/newsletter/projects/{id}/sources", "/v1/projects/{id}/sources"})
  @ResponseStatus(HttpStatus.CREATED)
  public SourceResponse create(@PathVariable UUID id, @Valid @RequestBody SourceRequest request) {
    Source source = new Source();
    source.setName(request.name());
    source.setType(request.type());
    source.setUrl(request.url());
    source.setCategory(request.category());
    if (request.active() != null) {
      source.setActive(request.active());
    }
    return SourceResponse.from(sourceService.create(id, source));
  }

  @PutMapping({"/api/newsletter/sources/{id}", "/v1/sources/{id}"})
  public SourceResponse update(@PathVariable UUID id, @Valid @RequestBody SourceRequest request) {
    Source source = new Source();
    source.setName(request.name());
    source.setType(request.type());
    source.setUrl(request.url());
    source.setCategory(request.category());
    if (request.active() != null) {
      source.setActive(request.active());
    }
    return SourceResponse.from(sourceService.update(id, source));
  }

  @DeleteMapping({"/api/newsletter/sources/{id}", "/v1/sources/{id}"})
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID id) {
    sourceService.delete(id);
  }

  @PostMapping({"/api/newsletter/sources/{id}/restore", "/v1/sources/{id}/restore"})
  public SourceResponse restore(@PathVariable UUID id) {
    return SourceResponse.from(sourceService.restore(id));
  }
}
