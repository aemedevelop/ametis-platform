package com.ametis.newsletter.editorial.service;

import com.ametis.newsletter.accessintegration.TenantContextHolder;
import com.ametis.newsletter.editorial.domain.EditorialSettings;
import com.ametis.newsletter.editorial.repository.EditorialSettingsRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class EditorialSettingsService {
  private final EditorialSettingsRepository repository;

  public EditorialSettingsService(EditorialSettingsRepository repository) {
    this.repository = repository;
  }

  public EditorialSettings getOrCreate(UUID projectId) {
    UUID tenantId = TenantContextHolder.requireTenantId();
    return repository.findByTenantIdAndProjectId(tenantId, projectId)
        .orElseGet(() -> {
          EditorialSettings defaults = new EditorialSettings();
          defaults.setTenantId(tenantId);
          defaults.setProjectId(projectId);
          defaults.setTone("professional");
          defaults.setWritingStyle("concise");
          defaults.setArticleLength("medium");
          defaults.setAudience("general");
          defaults.setIncludeSummary(true);
          defaults.setIncludeCta(true);
          return repository.save(defaults);
        });
  }

  public EditorialSettings upsert(UUID projectId, EditorialSettings payload) {
    EditorialSettings settings = getOrCreate(projectId);
    settings.setPreferredTopic(payload.getPreferredTopic());
    settings.setWritingStyle(payload.getWritingStyle());
    settings.setTone(payload.getTone());
    settings.setArticleLength(payload.getArticleLength());
    settings.setAudience(payload.getAudience());
    settings.setIncludeSummary(payload.isIncludeSummary());
    settings.setIncludeCta(payload.isIncludeCta());
    return repository.save(settings);
  }
}
