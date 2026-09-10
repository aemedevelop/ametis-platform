package com.ametis.agentfactory.deployments;

import com.ametis.agentfactory.agents.AgentDefinition;
import com.ametis.agentfactory.agents.AgentKnowledgeBase;
import com.ametis.agentfactory.agents.AgentKnowledgeBaseRepository;
import com.ametis.agentfactory.agents.AgentRepository;
import com.ametis.agentfactory.agents.AgentStatus;
import com.ametis.agentfactory.agents.AmetisAiQueryResponse;
import com.ametis.agentfactory.agents.AmetisAiRagClient;
import com.ametis.agentfactory.documents.RepositoryBinding;
import com.ametis.agentfactory.documents.RepositoryBindingRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Consumo público de un agente a través de un despliegue (canal).
 *
 * <p>La plataforma resuelve el despliegue por su {@code publicId} y actúa de
 * proxy hacia el RAG; el RAG no conoce despliegues. Aplica la seguridad propia
 * del canal antes de delegar la consulta.
 */
@Service
public class PublicDeploymentService {
  private final RepositoryBindingRepository repositoryBindingRepository;
  private final AgentDeploymentRepository deploymentRepository;
  private final AgentRepository agentRepository;
  private final AgentKnowledgeBaseRepository agentKnowledgeBaseRepository;
  private final AmetisAiRagClient ragClient;

  public PublicDeploymentService(
      RepositoryBindingRepository repositoryBindingRepository,
      AgentDeploymentRepository deploymentRepository,
      AgentRepository agentRepository,
      AgentKnowledgeBaseRepository agentKnowledgeBaseRepository,
      AmetisAiRagClient ragClient) {
    this.repositoryBindingRepository = repositoryBindingRepository;
    this.deploymentRepository = deploymentRepository;
    this.agentRepository = agentRepository;
    this.agentKnowledgeBaseRepository = agentKnowledgeBaseRepository;
    this.ragClient = ragClient;
  }

  public PublicDeploymentInfoResponse info(String publicId, String origin) {
    ResolvedDeployment resolved = resolve(publicId, origin);
    return PublicDeploymentInfoResponse.from(resolved.deployment(), resolved.agent());
  }

  public PublicQueryResponse query(String publicId, String origin, String question) {
    ResolvedDeployment resolved = resolve(publicId, origin);
    List<AgentKnowledgeBase> links = agentKnowledgeBaseRepository
        .findAllByTenantIdAndAgentIdIn(resolved.binding().getTenantId(), List.of(resolved.agent().getId()));
    if (links.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.deploymentAgentNotReady");
    }
    AmetisAiQueryResponse response = ragClient.query(
        resolved.binding().getRepositoryNamespace(),
        resolved.agent().getBusinessId().toString(),
        resolved.agent().getId(),
        links.get(0).getKnowledgeBaseId(),
        question.trim());

    AgentDefinition agent = resolved.agent();
    String answer = overrideAnswer(agent, response);
    List<String> suggestions = agent.getSuggestedQuestions().isEmpty()
        ? List.of()
        : agent.getSuggestedQuestions();
    return PublicQueryResponse.from(response, answer, suggestions);
  }

  /**
   * Sustituye el texto genérico del RAG por el que el cliente configuró en el
   * agente, según el tipo de respuesta prefabricada. La respuesta real del RAG
   * ({@code rag_answer}) nunca se toca.
   */
  private String overrideAnswer(AgentDefinition agent, AmetisAiQueryResponse response) {
    java.util.Map<String, String> texts = agent.getAssistantTexts();
    if (texts.isEmpty()) {
      return response.answer();
    }
    String key = null;
    if ("fallback".equals(response.responseType())) {
      key = "fallback";
    } else if (response.prebuiltKey() != null) {
      key = response.prebuiltKey();
    }
    if (key == null) {
      return response.answer();
    }
    String custom = texts.get(key);
    return custom == null || custom.isBlank() ? response.answer() : custom;
  }

  private ResolvedDeployment resolve(String publicId, String origin) {
    AgentDeployment deployment = deploymentRepository
        .findByPublicId(publicId == null ? "" : publicId.trim())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.deploymentNotFound"));
    if (deployment.getStatus() != DeploymentStatus.ACTIVE) {
      // No se distingue de "no existe": un canal inactivo no es público.
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "error.deploymentNotFound");
    }
    enforceChannelSecurity(deployment, origin);
    RepositoryBinding binding = repositoryBindingRepository
        .findByTenantId(deployment.getTenantId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.deploymentNotFound"));
    AgentDefinition agent = agentRepository
        .findByIdAndTenantId(deployment.getAgentId(), deployment.getTenantId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.deploymentNotFound"));
    if (agent.getStatus() != AgentStatus.READY) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.deploymentAgentNotReady");
    }
    return new ResolvedDeployment(binding, deployment, agent);
  }

  private void enforceChannelSecurity(AgentDeployment deployment, String origin) {
    // Primera versión: solo se sirve el canal WEB_CHAT. API (p. ej. WhatsApp) e
    // INTERNAL_TEST se incorporarán más adelante con su propia autorización.
    if (deployment.getChannelType() != DeploymentChannelType.WEB_CHAT) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "error.deploymentChannelNotAvailable");
    }
    if (!DeploymentOrigins.isAllowed(deployment.getAllowedOrigins(), origin)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "error.deploymentOriginNotAllowed");
    }
  }

  private record ResolvedDeployment(
      RepositoryBinding binding, AgentDeployment deployment, AgentDefinition agent) {}
}
