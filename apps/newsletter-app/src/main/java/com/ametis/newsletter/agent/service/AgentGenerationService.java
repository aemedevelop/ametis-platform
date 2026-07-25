package com.ametis.newsletter.agent.service;

import com.ametis.newsletter.accessintegration.TenantContextHolder;
import com.ametis.newsletter.agent.api.AgentDraftGeneratedWebhookRequest;
import com.ametis.newsletter.agent.api.AgentGenerationCreateRequest;
import com.ametis.newsletter.agent.api.AgentGenerationDetailResponse;
import com.ametis.newsletter.agent.api.AgentGenerationResponse;
import com.ametis.newsletter.agent.domain.GenerationRequest;
import com.ametis.newsletter.agent.domain.GenerationRequestSource;
import com.ametis.newsletter.agent.domain.GenerationRequestStatus;
import com.ametis.newsletter.agent.repository.GenerationRequestRepository;
import com.ametis.newsletter.agent.repository.GenerationRequestSourceRepository;
import com.ametis.newsletter.automation.domain.AutomationRun;
import com.ametis.newsletter.automation.domain.AutomationRunStatus;
import com.ametis.newsletter.automation.n8n.N8nClient;
import com.ametis.newsletter.automation.repository.AutomationRunRepository;
import com.ametis.newsletter.drafts.api.DraftResponse;
import com.ametis.newsletter.drafts.domain.Draft;
import com.ametis.newsletter.drafts.domain.DraftStatus;
import com.ametis.newsletter.drafts.repository.DraftRepository;
import com.ametis.newsletter.editorial.repository.NewsletterProjectRepository;
import com.ametis.newsletter.sources.domain.Source;
import com.ametis.newsletter.sources.repository.SourceRepository;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AgentGenerationService {
  private static final String DEFAULT_ROLE_PROFILE = "CONSULTOR_ESTRATEGICO";
  private static final String DEFAULT_WRITING_STYLE = "PROFESIONAL";
  private static final String DEFAULT_AUDIENCE = "PYMES";
  private static final String DEFAULT_LANGUAGE = "es";
  private static final String DEFAULT_LENGTH = "MEDIUM";
  private static final String DEFAULT_STRUCTURE_TYPE = "EXECUTIVE_SUMMARY";
  private static final String DEFAULT_CREATIVITY_LEVEL = "MEDIUM";

  private final GenerationRequestRepository generationRequestRepository;
  private final GenerationRequestSourceRepository generationRequestSourceRepository;
  private final NewsletterProjectRepository projectRepository;
  private final SourceRepository sourceRepository;
  private final DraftRepository draftRepository;
  private final AutomationRunRepository automationRunRepository;
  private final N8nClient n8nClient;

  public AgentGenerationService(
      GenerationRequestRepository generationRequestRepository,
      GenerationRequestSourceRepository generationRequestSourceRepository,
      NewsletterProjectRepository projectRepository,
      SourceRepository sourceRepository,
      DraftRepository draftRepository,
      AutomationRunRepository automationRunRepository,
      N8nClient n8nClient) {
    this.generationRequestRepository = generationRequestRepository;
    this.generationRequestSourceRepository = generationRequestSourceRepository;
    this.projectRepository = projectRepository;
    this.sourceRepository = sourceRepository;
    this.draftRepository = draftRepository;
    this.automationRunRepository = automationRunRepository;
    this.n8nClient = n8nClient;
  }

  @Transactional
  public AgentGenerationResponse createGeneration(UUID projectId, AgentGenerationCreateRequest request) {
    UUID tenantId = TenantContextHolder.requireTenantId();
    ensureProjectExists(tenantId, projectId);
    List<Source> sources = resolveSources(tenantId, projectId, request);

    GenerationRequest generationRequest = new GenerationRequest();
    generationRequest.setTenantId(tenantId);
    generationRequest.setProjectId(projectId);
    generationRequest.setTitleHint(trimToNull(request.titleHint()));
    generationRequest.setTopicHint(trimToNull(request.topicHint()));
    generationRequest.setRoleProfile(defaultString(request.roleProfile(), DEFAULT_ROLE_PROFILE));
    generationRequest.setWritingStyle(defaultString(request.writingStyle(), DEFAULT_WRITING_STYLE));
    generationRequest.setAudience(defaultString(request.audience(), DEFAULT_AUDIENCE));
    generationRequest.setLanguage(defaultString(request.language(), DEFAULT_LANGUAGE));
    generationRequest.setLength(defaultString(request.length(), DEFAULT_LENGTH));
    generationRequest.setStructureType(defaultString(request.structureType(), DEFAULT_STRUCTURE_TYPE));
    generationRequest.setCallToAction(trimToNull(request.callToAction()));
    generationRequest.setCreativityLevel(defaultString(request.creativityLevel(), DEFAULT_CREATIVITY_LEVEL));
    generationRequest.setUseReferences(Boolean.TRUE.equals(request.useReferences()));
    generationRequest.setIncludeSummary(request.includeSummary() == null || request.includeSummary());
    generationRequest.setIncludeConclusions(request.includeConclusions() == null || request.includeConclusions());
    generationRequest.setIncludeTags(Boolean.TRUE.equals(request.includeTags()));
    generationRequest.setMaxSources(request.maxSources());
    generationRequest.setStatus(GenerationRequestStatus.REQUESTED);
    generationRequest.setCreatedBy(resolveCurrentUserId());
    generationRequest = generationRequestRepository.save(generationRequest);

    for (int idx = 0; idx < sources.size(); idx++) {
      Source source = sources.get(idx);
      GenerationRequestSource relation = new GenerationRequestSource();
      relation.setTenantId(tenantId);
      relation.setGenerationRequestId(generationRequest.getId());
      relation.setSourceId(source.getId());
      relation.setPriorityOrder(idx + 1);
      generationRequestSourceRepository.save(relation);
    }

    AutomationRun run = new AutomationRun();
    run.setTenantId(tenantId);
    run.setProjectId(projectId);
    run.setTriggerType("AGENT");
    run.setStatus(AutomationRunStatus.RUNNING);
    run.setStartedAt(OffsetDateTime.now());
    run.setLogsSummary("Agent generation requested");
    run = automationRunRepository.save(run);

    try {
      N8nClient.N8nRunResponse response = n8nClient.triggerAgentGenerate(buildN8nPayload(generationRequest, sources));
      generationRequest.setStatus(GenerationRequestStatus.RUNNING);
      run.setStatus(AutomationRunStatus.RUNNING);
      run.setLogsSummary("n8n agent workflow triggered");

      if (response != null && response.executionId() != null && !response.executionId().isBlank()) {
        generationRequest.setExternalExecutionId(response.executionId());
        run.setExternalExecutionId(response.executionId());
      }
    } catch (Exception ex) {
      generationRequest.setStatus(GenerationRequestStatus.FAILED);
      run.setStatus(AutomationRunStatus.FAILED);
      run.setFinishedAt(OffsetDateTime.now());
      run.setLogsSummary("n8n trigger failed: " + ex.getMessage());
    }

    generationRequestRepository.save(generationRequest);
    automationRunRepository.save(run);
    return AgentGenerationResponse.from(generationRequest);
  }

  @Transactional(readOnly = true)
  public AgentGenerationDetailResponse getGeneration(UUID generationRequestId) {
    UUID tenantId = TenantContextHolder.requireTenantId();
    GenerationRequest generationRequest = generationRequestRepository.findByIdAndTenantId(generationRequestId, tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Generation request not found"));

    List<UUID> sourceIds = generationRequestSourceRepository
        .findAllByTenantIdAndGenerationRequestIdOrderByPriorityOrderAsc(tenantId, generationRequestId)
        .stream()
        .map(GenerationRequestSource::getSourceId)
        .toList();

    DraftResponse draft = draftRepository.findByTenantIdAndGenerationRequestId(tenantId, generationRequestId)
        .map(DraftResponse::from)
        .orElse(null);

    return AgentGenerationDetailResponse.from(generationRequest, sourceIds, draft);
  }

  @Transactional
  public AgentGenerationDetailResponse processDraftGeneratedWebhook(AgentDraftGeneratedWebhookRequest request) {
    GenerationRequest generationRequest = generationRequestRepository.findById(request.generationRequestId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Generation request not found"));

    if (request.tenantId() != null && !Objects.equals(request.tenantId(), generationRequest.getTenantId())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tenant mismatch for generation request");
    }
    if (request.projectId() != null && !Objects.equals(request.projectId(), generationRequest.getProjectId())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Project mismatch for generation request");
    }

    GenerationRequestStatus nextStatus = mapWebhookStatus(request.status());
    generationRequest.setStatus(nextStatus);

    if (request.externalExecutionId() != null && !request.externalExecutionId().isBlank()) {
      generationRequest.setExternalExecutionId(request.externalExecutionId());
    }
    generationRequestRepository.save(generationRequest);

    DraftResponse draftResponse = upsertDraftFromWebhook(generationRequest, request, nextStatus);
    syncAutomationRunStatus(generationRequest, request, nextStatus);

    List<UUID> sourceIds = generationRequestSourceRepository
        .findAllByTenantIdAndGenerationRequestIdOrderByPriorityOrderAsc(
            generationRequest.getTenantId(),
            generationRequest.getId())
        .stream()
        .map(GenerationRequestSource::getSourceId)
        .toList();

    return AgentGenerationDetailResponse.from(generationRequest, sourceIds, draftResponse);
  }

  private void ensureProjectExists(UUID tenantId, UUID projectId) {
    projectRepository.findByIdAndTenantId(projectId, tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
  }

  private List<Source> resolveSources(UUID tenantId, UUID projectId, AgentGenerationCreateRequest request) {
    boolean useAllActiveSources = Boolean.TRUE.equals(request.useAllActiveSources());
    if (useAllActiveSources) {
      List<Source> activeSources = sourceRepository.findAllByTenantIdAndProjectIdAndActiveTrue(tenantId, projectId);
      if (activeSources.isEmpty()) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No active sources found for project");
      }
      return activeSources;
    }

    if (request.sourceIds() == null || request.sourceIds().isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select at least one source or enable all active sources");
    }

    List<UUID> orderedSourceIds = request.sourceIds().stream()
        .filter(Objects::nonNull)
        .distinct()
        .toList();
    if (orderedSourceIds.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected sources are invalid");
    }

    List<Source> selectedSources = sourceRepository.findAllByTenantIdAndProjectIdAndActiveTrueAndIdIn(
        tenantId,
        projectId,
        orderedSourceIds);
    if (selectedSources.size() != orderedSourceIds.size()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Some sources are invalid or inactive");
    }

    Map<UUID, Source> byId = new HashMap<>();
    for (Source source : selectedSources) {
      byId.put(source.getId(), source);
    }
    return orderedSourceIds.stream().map(byId::get).toList();
  }

  private Map<String, Object> buildN8nPayload(GenerationRequest generationRequest, List<Source> sources) {
    Map<String, Object> editorialConfig = new HashMap<>();
    editorialConfig.put("titleHint", generationRequest.getTitleHint());
    editorialConfig.put("topicHint", generationRequest.getTopicHint());
    editorialConfig.put("roleProfile", generationRequest.getRoleProfile());
    editorialConfig.put("writingStyle", generationRequest.getWritingStyle());
    editorialConfig.put("audience", generationRequest.getAudience());
    editorialConfig.put("language", generationRequest.getLanguage());
    editorialConfig.put("length", generationRequest.getLength());
    editorialConfig.put("structureType", generationRequest.getStructureType());
    editorialConfig.put("callToAction", generationRequest.getCallToAction());
    editorialConfig.put("creativityLevel", generationRequest.getCreativityLevel());
    editorialConfig.put("useReferences", generationRequest.isUseReferences());
    editorialConfig.put("includeSummary", generationRequest.isIncludeSummary());
    editorialConfig.put("includeConclusions", generationRequest.isIncludeConclusions());
    editorialConfig.put("includeTags", generationRequest.isIncludeTags());
    editorialConfig.put("maxSources", generationRequest.getMaxSources());

    List<Map<String, Object>> mappedSources = java.util.stream.IntStream.range(0, sources.size())
        .mapToObj(index -> {
          Source source = sources.get(index);
          Map<String, Object> sourcePayload = new HashMap<>();
          sourcePayload.put("sourceId", source.getId().toString());
          sourcePayload.put("name", source.getName());
          sourcePayload.put("type", source.getType().name());
          sourcePayload.put("url", source.getUrl());
          sourcePayload.put("category", source.getCategory());
          sourcePayload.put("priority", index + 1);
          return sourcePayload;
        })
        .toList();

    Map<String, Object> payload = new HashMap<>();
    payload.put("tenantId", generationRequest.getTenantId().toString());
    payload.put("projectId", generationRequest.getProjectId().toString());
    payload.put("generationRequestId", generationRequest.getId().toString());
    payload.put("sourceIds", sources.stream().map(source -> source.getId().toString()).toList());
    payload.put("sources", mappedSources);
    payload.put("editorialConfig", editorialConfig);
    return payload;
  }

  private DraftResponse upsertDraftFromWebhook(
      GenerationRequest generationRequest,
      AgentDraftGeneratedWebhookRequest request,
      GenerationRequestStatus nextStatus) {
    boolean hasDraftPayload = hasText(request.generatedTitle())
        || hasText(request.generatedSummary())
        || hasText(request.generatedContent());

    if (nextStatus == GenerationRequestStatus.FAILED && !hasDraftPayload) {
      return draftRepository.findByTenantIdAndGenerationRequestId(
              generationRequest.getTenantId(),
              generationRequest.getId())
          .map(DraftResponse::from)
          .orElse(null);
    }

    Draft draft = draftRepository.findByTenantIdAndGenerationRequestId(
            generationRequest.getTenantId(),
            generationRequest.getId())
        .orElseGet(Draft::new);

    draft.setTenantId(generationRequest.getTenantId());
    draft.setProjectId(generationRequest.getProjectId());
    draft.setGenerationRequestId(generationRequest.getId());
    draft.setProposedTopic(trimToNull(request.proposedTopic()) == null
        ? generationRequest.getTopicHint()
        : trimToNull(request.proposedTopic()));
    draft.setGeneratedTitle(trimToNull(request.generatedTitle()) == null
        ? generationRequest.getTitleHint()
        : trimToNull(request.generatedTitle()));
    draft.setGeneratedSummary(trimToNull(request.generatedSummary()));
    draft.setGeneratedContent(trimToNull(request.generatedContent()));
    draft.setGenerationSource(defaultString(request.generationSource(), "n8n-agent"));
    draft.setStatus(DraftStatus.GENERATED);

    return DraftResponse.from(draftRepository.save(draft));
  }

  private void syncAutomationRunStatus(
      GenerationRequest generationRequest,
      AgentDraftGeneratedWebhookRequest request,
      GenerationRequestStatus nextStatus) {
    String externalExecutionId = generationRequest.getExternalExecutionId();
    if (!hasText(externalExecutionId)) {
      return;
    }

    automationRunRepository.findByTenantIdAndExternalExecutionId(generationRequest.getTenantId(), externalExecutionId)
        .ifPresent(run -> {
          run.setStatus(nextStatus == GenerationRequestStatus.FAILED
              ? AutomationRunStatus.FAILED
              : AutomationRunStatus.COMPLETED);
          run.setFinishedAt(OffsetDateTime.now());
          if (nextStatus == GenerationRequestStatus.FAILED) {
            run.setLogsSummary(defaultString(request.errorMessage(), "Agent generation failed"));
          } else {
            run.setLogsSummary(defaultString(request.logsSummary(), "Agent draft generated"));
          }
          automationRunRepository.save(run);
        });
  }

  private GenerationRequestStatus mapWebhookStatus(String status) {
    if (status == null) {
      return GenerationRequestStatus.COMPLETED;
    }
    String normalized = status.trim().toUpperCase(Locale.ROOT);
    if ("FAILED".equals(normalized) || "ERROR".equals(normalized)) {
      return GenerationRequestStatus.FAILED;
    }
    return GenerationRequestStatus.COMPLETED;
  }

  private UUID resolveCurrentUserId() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null || !authentication.isAuthenticated()) {
      return null;
    }
    try {
      return UUID.fromString(authentication.getName());
    } catch (Exception ex) {
      return null;
    }
  }

  private String defaultString(String value, String fallback) {
    String trimmed = trimToNull(value);
    return trimmed == null ? fallback : trimmed;
  }

  private String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private boolean hasText(String value) {
    return value != null && !value.trim().isEmpty();
  }
}
