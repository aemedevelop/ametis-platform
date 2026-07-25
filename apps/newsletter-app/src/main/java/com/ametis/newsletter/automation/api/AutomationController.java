package com.ametis.newsletter.automation.api;

import com.ametis.newsletter.automation.service.AutomationService;
import com.ametis.newsletter.drafts.api.DraftResponse;
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
@RequestMapping("/api/newsletter")
public class AutomationController {
  private final AutomationService automationService;

  public AutomationController(AutomationService automationService) {
    this.automationService = automationService;
  }

  @PostMapping("/projects/{id}/generate")
  @ResponseStatus(HttpStatus.ACCEPTED)
  public AutomationRunResponse generate(@PathVariable UUID id) {
    return AutomationRunResponse.from(automationService.triggerGenerate(id));
  }

  @GetMapping("/projects/{id}/automation-runs")
  public List<AutomationRunResponse> listRuns(@PathVariable UUID id) {
    return automationService.listRuns(id).stream().map(AutomationRunResponse::from).toList();
  }

  @PostMapping("/webhooks/n8n/draft-generated")
  public DraftResponse webhookDraftGenerated(@Valid @RequestBody N8nDraftWebhookRequest request) {
    return DraftResponse.from(automationService.processDraftGeneratedWebhook(request));
  }
}
