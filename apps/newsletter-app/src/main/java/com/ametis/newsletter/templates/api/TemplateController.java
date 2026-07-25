package com.ametis.newsletter.templates.api;

import com.ametis.newsletter.templates.domain.Template;
import com.ametis.newsletter.templates.service.TemplateService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/projects/{projectId}/templates")
public class TemplateController {
  private final TemplateService templateService;

  public TemplateController(TemplateService templateService) {
    this.templateService = templateService;
  }

  @GetMapping
  public List<TemplateResponse> list(@PathVariable UUID projectId) {
    return templateService.listByProject(projectId).stream().map(TemplateResponse::from).toList();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public TemplateResponse create(@PathVariable UUID projectId, @Valid @RequestBody TemplateRequest request) {
    Template template = new Template();
    template.setName(request.name());
    template.setStructure(request.structure());
    template.setStyleConfig(request.styleConfig());
    if (request.isDefault() != null) {
      template.setDefaultTemplate(request.isDefault());
    }
    return TemplateResponse.from(templateService.create(projectId, template));
  }
}