package com.ametis.agentfactory.agents;

import com.ametis.agentfactory.businesses.Business;
import com.ametis.agentfactory.documents.DocumentAssetRepository;
import com.ametis.agentfactory.documents.DocumentStatus;
import com.ametis.agentfactory.documents.RepositoryBinding;
import com.ametis.agentfactory.documents.RepositoryProvisioningService;
import com.ametis.agentfactory.documents.RepositoryStatus;
import com.ametis.agentfactory.knowledge.KnowledgeBase;
import com.ametis.agentfactory.knowledge.KnowledgeBaseRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AgentService {
  private static final Logger LOGGER = LoggerFactory.getLogger(AgentService.class);
  private final RepositoryProvisioningService provisioningService;
  private final AgentRepository agentRepository;
  private final AgentContextProfileRepository contextProfileRepository;
  private final AgentKnowledgeBaseRepository agentKnowledgeBaseRepository;
  private final KnowledgeBaseRepository knowledgeBaseRepository;
  private final DocumentAssetRepository documentAssetRepository;
  private final AmetisAiRagClient ragClient;

  public AgentService(
      RepositoryProvisioningService provisioningService,
      AgentRepository agentRepository,
      AgentContextProfileRepository contextProfileRepository,
      AgentKnowledgeBaseRepository agentKnowledgeBaseRepository,
      KnowledgeBaseRepository knowledgeBaseRepository,
      DocumentAssetRepository documentAssetRepository,
      AmetisAiRagClient ragClient) {
    this.provisioningService = provisioningService;
    this.agentRepository = agentRepository;
    this.contextProfileRepository = contextProfileRepository;
    this.agentKnowledgeBaseRepository = agentKnowledgeBaseRepository;
    this.knowledgeBaseRepository = knowledgeBaseRepository;
    this.documentAssetRepository = documentAssetRepository;
    this.ragClient = ragClient;
  }

  public List<AgentResponse> list(Business business) {
    UUID tenantId = business.getTenantId();
    requireActiveRepository(tenantId);
    List<AgentDefinition> agents = agentRepository.findAllByBusinessIdOrderByUpdatedAtDesc(business.getId());
    if (agents.isEmpty()) {
      return List.of();
    }
    List<UUID> agentIds = agents.stream().map(AgentDefinition::getId).toList();
    Map<UUID, AgentContextProfile> profilesByAgent = contextProfileRepository
        .findAllByTenantIdAndAgentIdIn(tenantId, agentIds)
        .stream()
        .collect(Collectors.toMap(AgentContextProfile::getAgentId, profile -> profile));
    List<AgentKnowledgeBase> links = agentKnowledgeBaseRepository.findAllByTenantIdAndAgentIdIn(tenantId, agentIds);
    List<UUID> baseIds = links.stream().map(AgentKnowledgeBase::getKnowledgeBaseId).distinct().toList();
    Map<UUID, String> baseNames = baseIds.isEmpty()
        ? Map.of()
        : knowledgeBaseRepository.findAllByTenantIdAndIdIn(tenantId, baseIds).stream()
            .collect(Collectors.toMap(KnowledgeBase::getId, KnowledgeBase::getName));
    Map<UUID, List<String>> namesByAgent = links.stream()
        .collect(Collectors.groupingBy(
            AgentKnowledgeBase::getAgentId,
            Collectors.mapping(link -> baseNames.get(link.getKnowledgeBaseId()), Collectors.filtering(name -> name != null, Collectors.toList()))));
    Map<UUID, List<UUID>> baseIdsByAgent = links.stream()
        .collect(Collectors.groupingBy(
            AgentKnowledgeBase::getAgentId,
            Collectors.mapping(AgentKnowledgeBase::getKnowledgeBaseId, Collectors.toList())));
    return agents.stream()
        .map(agent -> AgentResponse.from(
            agent,
            profilesByAgent.get(agent.getId()),
            baseIdsByAgent.getOrDefault(agent.getId(), List.of()),
            namesByAgent.getOrDefault(agent.getId(), List.of())))
        .toList();
  }

  @Transactional
  public AgentResponse create(Business business, UUID userId, AgentRequest request) {
    UUID tenantId = business.getTenantId();
    RepositoryBinding binding = requireActiveRepository(tenantId);
    String name = cleanName(request.name());
    if (agentRepository.existsByBusinessIdAndNameIgnoreCase(business.getId(), name)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.agentNameTaken");
    }
    AgentDefinition draft = AgentDefinition.create(
        tenantId,
        business.getId(),
        name,
        cleanText(request.description()),
        cleanText(request.instructions()),
        userId);
    draft.applyWidgetContent(
        cleanSuggestedQuestions(request.suggestedQuestions()),
        cleanAssistantTexts(request.assistantTexts()),
        request.suggestedQuestionsCount() == null ? 3 : request.suggestedQuestionsCount(),
        request.suggestedQuestionsOrder(),
        cleanQuestionTopics(request.questionTopics()));
    AgentDefinition agent = agentRepository.save(draft);
    syncSuggestionIndexQuietly(binding, business, agent);
    AgentContextProfile profile = contextProfileRepository.save(AgentContextProfile.create(
        tenantId,
        agent.getId(),
        cleanText(request.persona()),
        cleanText(request.targetAudience()),
        normalizeOption(request.tone(), "professional"),
        normalizeOption(request.responseLanguage(), "auto")));
    List<KnowledgeBase> bases = resolveKnowledgeBases(business.getId(), request.knowledgeBaseIds());
    agentKnowledgeBaseRepository.saveAll(bases.stream()
        .map(base -> AgentKnowledgeBase.link(tenantId, agent.getId(), base.getId()))
        .toList());
    return AgentResponse.from(
        agent,
        profile,
        bases.stream().map(KnowledgeBase::getId).toList(),
        bases.stream().map(KnowledgeBase::getName).toList());
  }

  @Transactional
  public AgentResponse update(Business business, UUID agentId, AgentRequest request) {
    UUID tenantId = business.getTenantId();
    RepositoryBinding binding = requireActiveRepository(tenantId);
    AgentDefinition agent = requireAgent(business, agentId);
    String name = cleanName(request.name());
    if (agentRepository.existsByBusinessIdAndNameIgnoreCaseAndIdNot(business.getId(), name, agentId)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.agentNameTaken");
    }
    agent.update(
        name,
        cleanText(request.description()),
        cleanText(request.instructions()));
    agent.applyWidgetContent(
        cleanSuggestedQuestions(request.suggestedQuestions()),
        cleanAssistantTexts(request.assistantTexts()),
        request.suggestedQuestionsCount() == null ? 3 : request.suggestedQuestionsCount(),
        request.suggestedQuestionsOrder(),
        cleanQuestionTopics(request.questionTopics()));
    AgentContextProfile profile = contextProfileRepository.findByAgentIdAndTenantId(agentId, tenantId)
        .orElseGet(() -> AgentContextProfile.create(tenantId, agentId, null, null, null, null));
    profile.update(
        cleanText(request.persona()),
        cleanText(request.targetAudience()),
        normalizeOption(request.tone(), "professional"),
        normalizeOption(request.responseLanguage(), "auto"));
    contextProfileRepository.save(profile);
    agentKnowledgeBaseRepository.deleteAllByTenantIdAndAgentId(tenantId, agentId);
    agentKnowledgeBaseRepository.flush();
    List<KnowledgeBase> bases = resolveKnowledgeBases(business.getId(), request.knowledgeBaseIds());
    agentKnowledgeBaseRepository.saveAll(bases.stream()
        .map(base -> AgentKnowledgeBase.link(tenantId, agent.getId(), base.getId()))
        .toList());
    AgentDefinition saved = agentRepository.save(agent);
    syncSuggestionIndexQuietly(binding, business, saved);
    return AgentResponse.from(
        saved,
        profile,
        bases.stream().map(KnowledgeBase::getId).toList(),
        bases.stream().map(KnowledgeBase::getName).toList());
  }

  @Transactional
  public void delete(Business business, UUID agentId) {
    UUID tenantId = business.getTenantId();
    RepositoryBinding binding = requireActiveRepository(tenantId);
    AgentDefinition agent = requireAgent(business, agentId);
    agentKnowledgeBaseRepository.deleteAllByTenantIdAndAgentId(tenantId, agentId);
    contextProfileRepository.deleteByAgentIdAndTenantId(agentId, tenantId);
    agentRepository.delete(agent);
    deleteSuggestionIndexQuietly(binding, agentId);
  }

  @Transactional
  public AgentResponse publish(Business business, UUID agentId) {
    UUID tenantId = business.getTenantId();
    RepositoryBinding binding = requireActiveRepository(tenantId);
    AgentDefinition agent = requireAgent(business, agentId);
    List<AgentKnowledgeBase> links = agentKnowledgeBaseRepository.findAllByTenantIdAndAgentIdIn(tenantId, List.of(agentId));
    if (links.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.agentPublishRequiresKnowledgeBase");
    }
    List<UUID> baseIds = links.stream().map(AgentKnowledgeBase::getKnowledgeBaseId).distinct().toList();
    AgentContextProfile profile = contextProfileRepository.findByAgentIdAndTenantId(agentId, tenantId).orElse(null);
    List<KnowledgeBase> bases = knowledgeBaseRepository.findAllByBusinessIdAndIdIn(business.getId(), baseIds);
    agent.publish();
    ragClient.syncAgent(new AmetisAiAgentSyncPayload(
        binding.getRepositoryNamespace(),
        business.getId().toString(),
        tenantId,
        agent.getId(),
        agent.getName(),
        agent.getDescription(),
        profile == null ? null : profile.getPersona(),
        profile == null ? null : profile.getTargetAudience(),
        profile == null ? null : profile.getTone(),
        profile == null ? null : profile.getResponseLanguage(),
        agent.getInstructions(),
        agent.getStatus(),
        agent.getPublishedAt() == null ? null : agent.getPublishedAt().toString(),
        agent.getUpdatedAt() == null ? null : agent.getUpdatedAt().toString(),
        bases.stream()
            .map(base -> new AmetisAiKnowledgeBaseSyncPayload(
                base.getId(),
                base.getName(),
                (int) documentAssetRepository.countByKnowledgeBaseIdAndStatus(base.getId(), DocumentStatus.STORED),
                base.getDocumentsFolderId()))
            .toList()));
    return AgentResponse.from(
        agentRepository.save(agent),
        profile,
        bases.stream().map(KnowledgeBase::getId).toList(),
        bases.stream().map(KnowledgeBase::getName).toList());
  }

  public AmetisAiCreateIndexingJobsResponse requestIndexing(Business business, UUID agentId, UUID requestedBy) {
    RepositoryBinding binding = requireActiveRepository(business.getTenantId());
    AgentDefinition agent = requireAgent(business, agentId);
    if (agent.getStatus() != AgentStatus.READY) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.agentIndexingRequiresPublishedAgent");
    }
    // La carpeta de cada base de conocimiento viaja en el sync del agente; el
    // RAG la usa por job. Aquí solo se dispara la creación de jobs.
    return ragClient.createIndexingJobs(
        binding.getRepositoryNamespace(),
        business.getId().toString(),
        agentId,
        requestedBy);
  }

  public List<AgentIndexingJobResponse> latestIndexingJobs(Business business, UUID agentId) {
    RepositoryBinding binding = requireActiveRepository(business.getTenantId());
    requireAgent(business, agentId);
    return ragClient.latestIndexingJobs(binding.getRepositoryNamespace(), agentId);
  }

  public AgentTestResponse testAgent(Business business, UUID agentId, AgentTestRequest request) {
    UUID tenantId = business.getTenantId();
    RepositoryBinding binding = requireActiveRepository(tenantId);
    AgentDefinition agent = requireAgent(business, agentId);
    if (agent.getStatus() != AgentStatus.READY) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.agentTestRequiresPublishedAgent");
    }
    List<AgentKnowledgeBase> links = agentKnowledgeBaseRepository.findAllByTenantIdAndAgentIdIn(tenantId, List.of(agentId));
    if (links.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.agentTestRequiresKnowledgeBase");
    }
    List<AgentIndexingJobResponse> jobs = ragClient.latestIndexingJobs(binding.getRepositoryNamespace(), agentId);
    boolean hasIndexedChunks = jobs.stream()
        .anyMatch(job -> "COMPLETED".equals(job.status()) && job.chunks() > 0);
    if (!hasIndexedChunks) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.agentTestRequiresIndexedKnowledge");
    }
    AmetisAiQueryResponse response = ragClient.query(
        binding.getRepositoryNamespace(),
        business.getId().toString(),
        agentId,
        links.get(0).getKnowledgeBaseId(),
        request.question().trim());
    return new AgentTestResponse(
        response.tenantId(),
        response.question(),
        response.answer(),
        response.responseType(),
        response.suggestions());
  }

  private AgentDefinition requireAgent(Business business, UUID agentId) {
    return agentRepository.findByIdAndBusinessId(agentId, business.getId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.agentNotFound"));
  }

  private RepositoryBinding requireActiveRepository(UUID tenantId) {
    RepositoryBinding binding = provisioningService.find(tenantId);
    if (binding.getStatus() != RepositoryStatus.ACTIVE) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.repositoryNotActive");
    }
    return binding;
  }

  private List<KnowledgeBase> resolveKnowledgeBases(UUID businessId, List<UUID> knowledgeBaseIds) {
    List<UUID> uniqueIds = knowledgeBaseIds == null ? List.of() : knowledgeBaseIds.stream()
        .filter(id -> id != null)
        .distinct()
        .toList();
    if (uniqueIds.isEmpty()) {
      return List.of();
    }
    List<KnowledgeBase> bases = knowledgeBaseRepository.findAllByBusinessIdAndIdIn(businessId, uniqueIds);
    if (bases.size() != uniqueIds.size()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "error.agentInvalidKnowledgeBases");
    }
    return bases;
  }

  private String cleanName(String name) {
    String cleaned = name == null ? "" : name.trim();
    if (cleaned.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "error.agentNameRequired");
    }
    return cleaned;
  }

  private String cleanText(String value) {
    String cleaned = value == null ? "" : value.trim();
    return cleaned.isBlank() ? null : cleaned;
  }

  private String normalizeOption(String value, String defaultValue) {
    String cleaned = cleanText(value);
    return cleaned == null ? defaultValue : cleaned.toLowerCase(java.util.Locale.ROOT);
  }

  private static final java.util.Set<String> ASSISTANT_TEXT_KEYS =
      java.util.Set.of("fallback", "greeting", "thanks", "farewell", "help");

  private List<String> cleanSuggestedQuestions(List<String> values) {
    if (values == null) {
      return List.of();
    }
    return values.stream()
        .map(value -> value == null ? "" : value.trim())
        .filter(value -> !value.isBlank())
        .map(value -> value.length() > 200 ? value.substring(0, 200) : value)
        .distinct()
        .limit(50)
        .toList();
  }

  private Map<String, String> cleanAssistantTexts(Map<String, String> values) {
    if (values == null || values.isEmpty()) {
      return Map.of();
    }
    java.util.LinkedHashMap<String, String> cleaned = new java.util.LinkedHashMap<>();
    for (String key : ASSISTANT_TEXT_KEYS) {
      String text = cleanText(values.get(key));
      if (text != null) {
        cleaned.put(key, text.length() > 500 ? text.substring(0, 500) : text);
      }
    }
    return cleaned;
  }

  private List<QuestionTopic> cleanQuestionTopics(List<QuestionTopic> topics) {
    if (topics == null || topics.isEmpty()) {
      return List.of();
    }
    List<QuestionTopic> cleaned = new java.util.ArrayList<>();
    java.util.Set<String> usedIds = new java.util.HashSet<>();
    int index = 0;
    for (QuestionTopic topic : topics) {
      if (topic == null) {
        continue;
      }
      List<String> questions = cleanSuggestedQuestions(topic.questions());
      if (questions.isEmpty()) {
        continue;
      }
      String label = cleanText(topic.label());
      String id = slug(topic.id() != null && !topic.id().isBlank() ? topic.id() : label);
      if (id.isBlank()) {
        id = "tema-" + (index + 1);
      }
      while (!usedIds.add(id)) {
        id = id + "-" + (++index);
      }
      cleaned.add(new QuestionTopic(id, label == null ? id : label, questions));
      index++;
    }
    return cleaned;
  }

  private static String slug(String value) {
    if (value == null) {
      return "";
    }
    String normalized = java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD)
        .replaceAll("\\p{M}+", "")
        .toLowerCase(java.util.Locale.ROOT)
        .replaceAll("[^a-z0-9]+", "-")
        .replaceAll("(^-+|-+$)", "");
    return normalized.length() > 40 ? normalized.substring(0, 40) : normalized;
  }

  private void syncSuggestionIndexQuietly(RepositoryBinding binding, Business business, AgentDefinition agent) {
    try {
      List<AmetisAiSuggestionItem> items = new java.util.ArrayList<>();
      for (String question : agent.getSuggestedQuestions()) {
        items.add(new AmetisAiSuggestionItem("__general__", question));
      }
      for (QuestionTopic topic : agent.getQuestionTopics()) {
        for (String question : topic.questions()) {
          items.add(new AmetisAiSuggestionItem(topic.id(), question));
        }
      }
      ragClient.syncSuggestionIndex(
          binding.getRepositoryNamespace(), business.getId().toString(), agent.getId(), items);
    } catch (RuntimeException exception) {
      LOGGER.warn("No se pudo sincronizar el indice de preguntas sugeridas | agent={}", agent.getId(), exception);
    }
  }

  private void deleteSuggestionIndexQuietly(RepositoryBinding binding, UUID agentId) {
    try {
      ragClient.deleteSuggestionIndex(binding.getRepositoryNamespace(), agentId);
    } catch (RuntimeException exception) {
      LOGGER.warn("No se pudo borrar el indice de preguntas sugeridas | agent={}", agentId, exception);
    }
  }
}
