package com.ametis.agentfactory.agents;

import com.ametis.agentfactory.businesses.Business;
import com.ametis.agentfactory.deployments.AgentDeploymentExport;
import com.ametis.agentfactory.deployments.DeploymentService;
import com.ametis.agentfactory.knowledge.KnowledgeBase;
import com.ametis.agentfactory.knowledge.KnowledgeBaseRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Exporta un agente (configuración + todos sus despliegues) a un paquete
 * portable entre entornos -- típicamente de "pre" (donde se prueba y ajusta)
 * a producción, para no tener que rehacer manualmente la misma configuración
 * dos veces -- y lo vuelve a crear a partir de ese paquete.
 *
 * <p>Las bases de conocimiento NO viajan: sus documentos indexados viven en
 * el storage propio de cada tenant (Drive/MinIO), así que no hay forma de
 * "copiarlas" entre entornos distintos sin volver a subir/indexar todo. Solo
 * se listan sus nombres en el export, como referencia para recrear/vincular
 * las bases correspondientes a mano después de importar.
 *
 * <p>Todo lo importado nace en borrador: el agente sin bases vinculadas
 * (estado {@code DRAFT}, igual que cualquier agente recién creado) y sus
 * despliegues en estado {@code INACTIVE}, sin importar el estado que tenían
 * en el entorno de origen -- así se revisa la configuración (orígenes
 * permitidos, etc.) antes de exponer nada de verdad en el nuevo entorno.
 */
@Service
public class AgentTransferService {
  private static final int EXPORT_VERSION = 1;

  private final AgentRepository agentRepository;
  private final AgentContextProfileRepository contextProfileRepository;
  private final AgentKnowledgeBaseRepository agentKnowledgeBaseRepository;
  private final KnowledgeBaseRepository knowledgeBaseRepository;
  private final AgentService agentService;
  private final DeploymentService deploymentService;

  public AgentTransferService(
      AgentRepository agentRepository,
      AgentContextProfileRepository contextProfileRepository,
      AgentKnowledgeBaseRepository agentKnowledgeBaseRepository,
      KnowledgeBaseRepository knowledgeBaseRepository,
      AgentService agentService,
      DeploymentService deploymentService) {
    this.agentRepository = agentRepository;
    this.contextProfileRepository = contextProfileRepository;
    this.agentKnowledgeBaseRepository = agentKnowledgeBaseRepository;
    this.knowledgeBaseRepository = knowledgeBaseRepository;
    this.agentService = agentService;
    this.deploymentService = deploymentService;
  }

  public AgentExportBundle export(Business business, UUID agentId) {
    UUID tenantId = business.getTenantId();
    AgentDefinition agent = agentRepository.findByIdAndBusinessId(agentId, business.getId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.agentNotFound"));
    AgentContextProfile profile = contextProfileRepository.findByAgentIdAndTenantId(agentId, tenantId).orElse(null);

    List<AgentKnowledgeBase> links = agentKnowledgeBaseRepository.findAllByTenantIdAndAgentIdIn(tenantId, List.of(agentId));
    List<UUID> baseIds = links.stream().map(AgentKnowledgeBase::getKnowledgeBaseId).distinct().toList();
    List<String> baseNames = baseIds.isEmpty()
        ? List.of()
        : knowledgeBaseRepository.findAllByTenantIdAndIdIn(tenantId, baseIds).stream()
            .map(KnowledgeBase::getName)
            .toList();

    AgentExportData agentData = new AgentExportData(
        agent.getName(),
        agent.getDescription(),
        profile == null ? null : profile.getPersona(),
        profile == null ? null : profile.getTargetAudience(),
        profile == null ? null : profile.getTone(),
        profile == null ? null : profile.getResponseLanguage(),
        agent.getInstructions(),
        agent.getSuggestedQuestions(),
        agent.getAssistantTexts(),
        agent.getSuggestedQuestionsCount(),
        agent.getSuggestedQuestionsOrder(),
        agent.getQuestionTopics(),
        baseNames);

    List<AgentDeploymentExport> deployments = deploymentService.exportForAgent(tenantId, agentId);
    return new AgentExportBundle(EXPORT_VERSION, OffsetDateTime.now(), agentData, deployments);
  }

  @Transactional
  public AgentResponse importBundle(Business business, UUID userId, AgentExportBundle bundle) {
    if (bundle == null || bundle.agent() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "error.agentImportInvalid");
    }
    AgentExportData data = bundle.agent();
    AgentRequest request = new AgentRequest(
        uniqueAgentName(business, data.name()),
        data.description(),
        data.persona(),
        data.targetAudience(),
        data.tone(),
        data.responseLanguage(),
        data.instructions(),
        data.suggestedQuestions(),
        data.assistantTexts(),
        data.suggestedQuestionsCount(),
        data.suggestedQuestionsOrder(),
        data.questionTopics(),
        List.of());
    AgentResponse created = agentService.create(business, userId, request);

    if (bundle.deployments() != null) {
      for (AgentDeploymentExport item : bundle.deployments()) {
        deploymentService.importDeployment(business.getTenantId(), userId, created.id(), item);
      }
    }
    return created;
  }

  /** Evita choques de nombre: "Soporte", "Soporte (2)", "Soporte (3)"... */
  private String uniqueAgentName(Business business, String name) {
    String base = (name == null || name.isBlank()) ? "Agente importado" : name.trim();
    String candidate = base;
    int suffix = 2;
    while (agentRepository.existsByBusinessIdAndNameIgnoreCase(business.getId(), candidate)) {
      candidate = base + " (" + suffix + ")";
      suffix++;
    }
    return candidate;
  }
}
