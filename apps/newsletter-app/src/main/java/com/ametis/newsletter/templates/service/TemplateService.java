package com.ametis.newsletter.templates.service;

import com.ametis.newsletter.accessintegration.TenantContextHolder;
import com.ametis.newsletter.templates.domain.Template;
import com.ametis.newsletter.templates.repository.TemplateRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TemplateService {
  private final TemplateRepository templateRepository;

  public TemplateService(TemplateRepository templateRepository) {
    this.templateRepository = templateRepository;
  }

  public List<Template> listByProject(UUID projectId) {
    UUID tenantId = TenantContextHolder.requireTenantId();
    return templateRepository.findAllByTenantIdAndProjectId(tenantId, projectId);
  }

  public Template create(UUID projectId, Template template) {
    UUID tenantId = TenantContextHolder.requireTenantId();
    template.setTenantId(tenantId);
    template.setProjectId(projectId);
    return templateRepository.save(template);
  }

  public Template get(UUID id) {
    UUID tenantId = TenantContextHolder.requireTenantId();
    return templateRepository.findByIdAndTenantId(id, tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Template not found"));
  }
}