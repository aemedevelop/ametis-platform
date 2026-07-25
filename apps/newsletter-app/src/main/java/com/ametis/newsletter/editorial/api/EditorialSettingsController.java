package com.ametis.newsletter.editorial.api;

import com.ametis.newsletter.editorial.domain.EditorialSettings;
import com.ametis.newsletter.editorial.service.EditorialSettingsService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping
public class EditorialSettingsController {
  private final EditorialSettingsService settingsService;

  public EditorialSettingsController(EditorialSettingsService settingsService) {
    this.settingsService = settingsService;
  }

  @GetMapping({"/api/newsletter/projects/{id}/editorial-settings", "/v1/projects/{id}/editorial-settings"})
  public EditorialSettingsResponse get(@PathVariable UUID id) {
    return EditorialSettingsResponse.from(settingsService.getOrCreate(id));
  }

  @PutMapping({"/api/newsletter/projects/{id}/editorial-settings", "/v1/projects/{id}/editorial-settings"})
  public EditorialSettingsResponse update(
      @PathVariable UUID id,
      @Valid @RequestBody EditorialSettingsRequest request) {
    EditorialSettings settings = new EditorialSettings();
    settings.setPreferredTopic(request.preferredTopic());
    settings.setWritingStyle(request.writingStyle());
    settings.setTone(request.tone());
    settings.setArticleLength(request.articleLength());
    settings.setAudience(request.audience());
    settings.setIncludeSummary(request.includeSummary() == null || request.includeSummary());
    settings.setIncludeCta(request.includeCta() == null || request.includeCta());
    return EditorialSettingsResponse.from(settingsService.upsert(id, settings));
  }
}
