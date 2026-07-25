package com.ametis.newsletter.agent.api;

import com.ametis.newsletter.agent.service.AgentGenerationService;
import jakarta.validation.Valid;
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
public class AgentGenerationController {
  private final AgentGenerationService agentGenerationService;

  public AgentGenerationController(AgentGenerationService agentGenerationService) {
    this.agentGenerationService = agentGenerationService;
  }

  @PostMapping("/projects/{projectId}/agent/generations")
  @ResponseStatus(HttpStatus.ACCEPTED)
  public AgentGenerationResponse createGeneration(
      @PathVariable UUID projectId,
      @Valid @RequestBody AgentGenerationCreateRequest request) {
    return agentGenerationService.createGeneration(projectId, request);
  }

  @GetMapping("/agent/generations/{id}")
  public AgentGenerationDetailResponse getGeneration(@PathVariable UUID id) {
    return agentGenerationService.getGeneration(id);
  }

  @PostMapping("/webhooks/n8n/agent-draft-generated")
  public AgentGenerationDetailResponse webhookAgentDraftGenerated(
      @Valid @RequestBody AgentDraftGeneratedWebhookRequest request) {
    return agentGenerationService.processDraftGeneratedWebhook(request);
  }
}
