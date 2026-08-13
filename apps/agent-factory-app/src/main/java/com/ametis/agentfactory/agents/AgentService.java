package com.ametis.agentfactory.agents;

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
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AgentService {
  private final RepositoryProvisioningService provisioningService;
  private final AgentRepository agentRepository;
  private final AgentKnowledgeBaseRepository agentKnowledgeBaseRepository;
  private final KnowledgeBaseRepository knowledgeBaseRepository;
  private final AmetisAiRagClient ragClient;

  public AgentService(
      RepositoryProvisioningService provisioningService,
      AgentRepository agentRepository,
      AgentKnowledgeBaseRepository agentKnowledgeBaseRepository,
      KnowledgeBaseRepository knowledgeBaseRepository,
      AmetisAiRagClient ragClient) {
    this.provisioningService = provisioningService;
    this.agentRepository = agentRepository;
    this.agentKnowledgeBaseRepository = agentKnowledgeBaseRepository;
    this.knowledgeBaseRepository = knowledgeBaseRepository;
    this.ragClient = ragClient;
  }

  public List<AgentResponse> list(UUID tenantId) {
    requireActiveRepository(tenantId);
    List<AgentDefinition> agents = agentRepository.findAllByTenantIdOrderByUpdatedAtDesc(tenantId);
    if (agents.isEmpty()) {
      return List.of();
    }
    List<UUID> agentIds = agents.stream().map(AgentDefinition::getId).toList();
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
    return agents.stream()
        .map(agent -> AgentResponse.from(agent, namesByAgent.getOrDefault(agent.getId(), List.of())))
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
        tenantId, name, cleanText(request.description()), cleanText(request.instructions()), userId));
    List<KnowledgeBase> bases = resolveKnowledgeBases(tenantId, request.knowledgeBaseIds());
    agentKnowledgeBaseRepository.saveAll(bases.stream()
        .map(base -> AgentKnowledgeBase.link(tenantId, agent.getId(), base.getId()))
        .toList());
    return AgentResponse.from(agent, bases.stream().map(KnowledgeBase::getName).toList());
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
    agent.update(name, cleanText(request.description()), cleanText(request.instructions()));
    agentKnowledgeBaseRepository.deleteAllByTenantIdAndAgentId(tenantId, agentId);
    List<KnowledgeBase> bases = resolveKnowledgeBases(tenantId, request.knowledgeBaseIds());
    agentKnowledgeBaseRepository.saveAll(bases.stream()
        .map(base -> AgentKnowledgeBase.link(tenantId, agent.getId(), base.getId()))
        .toList());
    return AgentResponse.from(agentRepository.save(agent), bases.stream().map(KnowledgeBase::getName).toList());
  }

  @Transactional
  public void delete(UUID tenantId, UUID agentId) {
    requireActiveRepository(tenantId);
    AgentDefinition agent = agentRepository.findByIdAndTenantId(agentId, tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.agentNotFound"));
    agentKnowledgeBaseRepository.deleteAllByTenantIdAndAgentId(tenantId, agentId);
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
    List<String> baseNames = knowledgeBaseRepository.findAllByTenantIdAndIdIn(tenantId, baseIds).stream()
        .map(KnowledgeBase::getName)
        .toList();
    agent.publish();
    baseIds.forEach(baseId -> ragClient.ingest(binding.getRepositoryNamespace(), agent.getId(), baseId));
    return AgentResponse.from(agentRepository.save(agent), baseNames);
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
}
