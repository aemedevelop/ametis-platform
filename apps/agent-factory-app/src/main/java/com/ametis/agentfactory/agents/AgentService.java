package com.ametis.agentfactory.agents;

import com.ametis.agentfactory.documents.RepositoryBinding;
import com.ametis.agentfactory.documents.RepositoryProvisioningService;
import com.ametis.agentfactory.documents.RepositoryStatus;
import com.ametis.agentfactory.knowledge.KnowledgeBase;
import com.ametis.agentfactory.knowledge.KnowledgeBaseDocument;
import com.ametis.agentfactory.knowledge.KnowledgeBaseDocumentRepository;
import com.ametis.agentfactory.knowledge.KnowledgeBaseRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AgentService {
  private final RepositoryProvisioningService provisioningService;
  private final AgentRepository agentRepository;
  private final AgentContextProfileRepository contextProfileRepository;
  private final AgentKnowledgeBaseRepository agentKnowledgeBaseRepository;
  private final KnowledgeBaseRepository knowledgeBaseRepository;
  private final KnowledgeBaseDocumentRepository knowledgeBaseDocumentRepository;
  private final AmetisAiRagClient ragClient;

  public AgentService(
      RepositoryProvisioningService provisioningService,
      AgentRepository agentRepository,
      AgentContextProfileRepository contextProfileRepository,
      AgentKnowledgeBaseRepository agentKnowledgeBaseRepository,
      KnowledgeBaseRepository knowledgeBaseRepository,
      KnowledgeBaseDocumentRepository knowledgeBaseDocumentRepository,
      AmetisAiRagClient ragClient) {
    this.provisioningService = provisioningService;
    this.agentRepository = agentRepository;
    this.contextProfileRepository = contextProfileRepository;
    this.agentKnowledgeBaseRepository = agentKnowledgeBaseRepository;
    this.knowledgeBaseRepository = knowledgeBaseRepository;
    this.knowledgeBaseDocumentRepository = knowledgeBaseDocumentRepository;
    this.ragClient = ragClient;
  }

  public List<AgentResponse> list(UUID tenantId) {
    requireActiveRepository(tenantId);
    List<AgentDefinition> agents = agentRepository.findAllByTenantIdOrderByUpdatedAtDesc(tenantId);
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
  public AgentResponse create(UUID tenantId, UUID userId, AgentRequest request) {
    requireActiveRepository(tenantId);
    String name = cleanName(request.name());
    if (agentRepository.existsByTenantIdAndNameIgnoreCase(tenantId, name)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.agentNameTaken");
    }
    AgentDefinition agent = agentRepository.save(AgentDefinition.create(
        tenantId,
        name,
        cleanText(request.description()),
        cleanText(request.instructions()),
        userId));
    AgentContextProfile profile = contextProfileRepository.save(AgentContextProfile.create(
        tenantId,
        agent.getId(),
        cleanText(request.persona()),
        cleanText(request.targetAudience()),
        normalizeOption(request.tone(), "professional"),
        normalizeOption(request.responseLanguage(), "auto")));
    List<KnowledgeBase> bases = resolveKnowledgeBases(tenantId, request.knowledgeBaseIds());
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
  public AgentResponse update(UUID tenantId, UUID agentId, AgentRequest request) {
    requireActiveRepository(tenantId);
    AgentDefinition agent = agentRepository.findByIdAndTenantId(agentId, tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.agentNotFound"));
    String name = cleanName(request.name());
    if (agentRepository.existsByTenantIdAndNameIgnoreCaseAndIdNot(tenantId, name, agentId)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.agentNameTaken");
    }
    agent.update(
        name,
        cleanText(request.description()),
        cleanText(request.instructions()));
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
    List<KnowledgeBase> bases = resolveKnowledgeBases(tenantId, request.knowledgeBaseIds());
    agentKnowledgeBaseRepository.saveAll(bases.stream()
        .map(base -> AgentKnowledgeBase.link(tenantId, agent.getId(), base.getId()))
        .toList());
    return AgentResponse.from(
        agentRepository.save(agent),
        profile,
        bases.stream().map(KnowledgeBase::getId).toList(),
        bases.stream().map(KnowledgeBase::getName).toList());
  }

  @Transactional
  public void delete(UUID tenantId, UUID agentId) {
    requireActiveRepository(tenantId);
    AgentDefinition agent = agentRepository.findByIdAndTenantId(agentId, tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.agentNotFound"));
    agentKnowledgeBaseRepository.deleteAllByTenantIdAndAgentId(tenantId, agentId);
    contextProfileRepository.deleteByAgentIdAndTenantId(agentId, tenantId);
    agentRepository.delete(agent);
  }

  @Transactional
  public AgentResponse publish(UUID tenantId, UUID agentId) {
    RepositoryBinding binding = requireActiveRepository(tenantId);
    AgentDefinition agent = agentRepository.findByIdAndTenantId(agentId, tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.agentNotFound"));
    List<AgentKnowledgeBase> links = agentKnowledgeBaseRepository.findAllByTenantIdAndAgentIdIn(tenantId, List.of(agentId));
    if (links.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.agentPublishRequiresKnowledgeBase");
    }
    List<UUID> baseIds = links.stream().map(AgentKnowledgeBase::getKnowledgeBaseId).distinct().toList();
    AgentContextProfile profile = contextProfileRepository.findByAgentIdAndTenantId(agentId, tenantId).orElse(null);
    List<KnowledgeBase> bases = knowledgeBaseRepository.findAllByTenantIdAndIdIn(tenantId, baseIds);
    Map<UUID, Long> documentCountByBase = knowledgeBaseDocumentRepository
        .findAllByTenantIdAndKnowledgeBaseIdIn(tenantId, baseIds)
        .stream()
        .collect(Collectors.groupingBy(KnowledgeBaseDocument::getKnowledgeBaseId, Collectors.counting()));
    agent.publish();
    ragClient.syncAgent(new AmetisAiAgentSyncPayload(
        binding.getRepositoryNamespace(),
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
                documentCountByBase.getOrDefault(base.getId(), 0L).intValue()))
            .toList()));
    return AgentResponse.from(
        agentRepository.save(agent),
        profile,
        bases.stream().map(KnowledgeBase::getId).toList(),
        bases.stream().map(KnowledgeBase::getName).toList());
  }

  public AmetisAiCreateIndexingJobsResponse requestIndexing(UUID tenantId, UUID agentId, UUID requestedBy) {
    RepositoryBinding binding = requireActiveRepository(tenantId);
    AgentDefinition agent = agentRepository.findByIdAndTenantId(agentId, tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.agentNotFound"));
    if (agent.getStatus() != AgentStatus.READY) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.agentIndexingRequiresPublishedAgent");
    }
    return ragClient.createIndexingJobs(binding.getRepositoryNamespace(), agentId, requestedBy);
  }

  public List<AgentIndexingJobResponse> latestIndexingJobs(UUID tenantId, UUID agentId) {
    RepositoryBinding binding = requireActiveRepository(tenantId);
    agentRepository.findByIdAndTenantId(agentId, tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.agentNotFound"));
    return ragClient.latestIndexingJobs(binding.getRepositoryNamespace(), agentId);
  }

  public AgentTestResponse testAgent(UUID tenantId, UUID agentId, AgentTestRequest request) {
    RepositoryBinding binding = requireActiveRepository(tenantId);
    AgentDefinition agent = agentRepository.findByIdAndTenantId(agentId, tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.agentNotFound"));
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

  private RepositoryBinding requireActiveRepository(UUID tenantId) {
    RepositoryBinding binding = provisioningService.find(tenantId);
    if (binding.getStatus() != RepositoryStatus.ACTIVE) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.repositoryNotActive");
    }
    return binding;
  }

  private List<KnowledgeBase> resolveKnowledgeBases(UUID tenantId, List<UUID> knowledgeBaseIds) {
    List<UUID> uniqueIds = knowledgeBaseIds == null ? List.of() : knowledgeBaseIds.stream()
        .filter(id -> id != null)
        .distinct()
        .toList();
    if (uniqueIds.isEmpty()) {
      return List.of();
    }
    List<KnowledgeBase> bases = knowledgeBaseRepository.findAllByTenantIdAndIdIn(tenantId, uniqueIds);
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
}
