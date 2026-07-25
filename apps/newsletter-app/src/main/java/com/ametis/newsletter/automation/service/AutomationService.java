package com.ametis.newsletter.automation.service;

import com.ametis.newsletter.accessintegration.TenantContextHolder;
import com.ametis.newsletter.automation.api.N8nDraftWebhookRequest;
import com.ametis.newsletter.automation.domain.AutomationRun;
import com.ametis.newsletter.automation.domain.AutomationRunStatus;
import com.ametis.newsletter.automation.n8n.N8nClient;
import com.ametis.newsletter.automation.repository.AutomationRunRepository;
import com.ametis.newsletter.drafts.domain.Draft;
import com.ametis.newsletter.drafts.domain.DraftStatus;
import com.ametis.newsletter.drafts.repository.DraftRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AutomationService {
  private final AutomationRunRepository automationRunRepository;
  private final DraftRepository draftRepository;
  private final N8nClient n8nClient;

  public AutomationService(
      AutomationRunRepository automationRunRepository,
      DraftRepository draftRepository,
      N8nClient n8nClient) {
    this.automationRunRepository = automationRunRepository;
    this.draftRepository = draftRepository;
    this.n8nClient = n8nClient;
  }

  public AutomationRun triggerGenerate(UUID projectId) {
    UUID tenantId = TenantContextHolder.requireTenantId();
    AutomationRun run = new AutomationRun();
    run.setTenantId(tenantId);
    run.setProjectId(projectId);
    run.setTriggerType("MANUAL");
    run.setStatus(AutomationRunStatus.RUNNING);
    run.setStartedAt(OffsetDateTime.now());
    run = automationRunRepository.save(run);

    try {
      N8nClient.N8nRunResponse response = n8nClient.triggerGenerate(Map.of(
          "tenantId", tenantId.toString(),
          "projectId", projectId.toString(),
          "runId", run.getId().toString()));
      if (response != null) {
        run.setExternalExecutionId(response.executionId());
      }
      run.setLogsSummary("n8n workflow triggered");
    } catch (Exception ex) {
      run.setStatus(AutomationRunStatus.FAILED);
      run.setFinishedAt(OffsetDateTime.now());
      run.setLogsSummary("n8n trigger failed: " + ex.getMessage());
      return automationRunRepository.save(run);
    }

    return automationRunRepository.save(run);
  }

  public List<AutomationRun> listRuns(UUID projectId) {
    UUID tenantId = TenantContextHolder.requireTenantId();
    return automationRunRepository.findAllByTenantIdAndProjectIdOrderByStartedAtDesc(tenantId, projectId);
  }

  public Draft processDraftGeneratedWebhook(N8nDraftWebhookRequest request) {
    Draft draft = new Draft();
    draft.setTenantId(request.tenantId());
    draft.setProjectId(request.projectId());
    draft.setProposedTopic(request.proposedTopic());
    draft.setGeneratedTitle(request.generatedTitle());
    draft.setGeneratedSummary(request.generatedSummary());
    draft.setGeneratedContent(request.generatedContent());
    draft.setGenerationSource(request.generationSource() == null ? "n8n" : request.generationSource());
    draft.setStatus(DraftStatus.GENERATED);
    Draft saved = draftRepository.save(draft);

    if (request.externalExecutionId() != null && !request.externalExecutionId().isBlank()) {
      AutomationRun run = automationRunRepository.findByTenantIdAndExternalExecutionId(
              request.tenantId(),
              request.externalExecutionId())
          .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Automation run not found"));
      run.setStatus(AutomationRunStatus.COMPLETED);
      run.setFinishedAt(OffsetDateTime.now());
      run.setLogsSummary(request.logsSummary() == null ? "Draft generated" : request.logsSummary());
      automationRunRepository.save(run);
    }
    return saved;
  }
}
