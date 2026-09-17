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
import com.ametis.agentfactory.storage.StorageProvider;
import java.io.OutputStream;
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
  private final StorageProvider storageProvider;
  private final DeploymentEndpoints endpoints;

  public PublicDeploymentService(
      RepositoryBindingRepository repositoryBindingRepository,
      AgentDeploymentRepository deploymentRepository,
      AgentRepository agentRepository,
      AgentKnowledgeBaseRepository agentKnowledgeBaseRepository,
      AmetisAiRagClient ragClient,
      StorageProvider storageProvider,
      DeploymentEndpoints endpoints) {
    this.repositoryBindingRepository = repositoryBindingRepository;
    this.deploymentRepository = deploymentRepository;
    this.agentRepository = agentRepository;
    this.agentKnowledgeBaseRepository = agentKnowledgeBaseRepository;
    this.ragClient = ragClient;
    this.storageProvider = storageProvider;
    this.endpoints = endpoints;
  }

  public PublicDeploymentInfoResponse info(String publicId, String origin) {
    ResolvedDeployment resolved = resolve(publicId, origin);
    String avatarUrl = endpoints.describe(resolved.deployment()).avatarUrl();
    return PublicDeploymentInfoResponse.from(resolved.deployment(), resolved.agent(), avatarUrl);
  }

  /** Content-type del avatar servido. */
  public record AvatarDescriptor(String mimeType) {}

  public AvatarDescriptor avatar(String publicId, OutputStream outputStream) {
    AgentDeployment deployment = resolveForAsset(publicId);
    if (deployment.getThemeAvatarKey() == null || deployment.getThemeAvatarKey().isBlank()) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "error.deploymentAvatarNotFound");
    }
    try {
      StorageProvider.StoredObject object = storageProvider.getObject(deployment.getTenantId(), deployment.getThemeAvatarKey());
      storageProvider.downloadObject(deployment.getTenantId(), deployment.getThemeAvatarKey(), outputStream);
      return new AvatarDescriptor(object.mimeType() == null ? "application/octet-stream" : object.mimeType());
    } catch (ResponseStatusException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "error.storageDownloadFailed", exception);
    }
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
    List<String> suggestions = followUpPool(agent, response.matchedTopicId());
    return PublicQueryResponse.from(response, answer, suggestions);
  }

  /**
   * Preguntas para los chips de follow-up: las del tema que casó el RAG, o el
   * fondo "General" si no casó ninguno. El widget elige el subconjunto final.
   */
  private List<String> followUpPool(AgentDefinition agent, String matchedTopicId) {
    if (matchedTopicId != null && !matchedTopicId.isBlank()) {
      return agent.getQuestionTopics().stream()
          .filter(topic -> matchedTopicId.equals(topic.id()))
          .findFirst()
          .map(topic -> topic.questions())
          .filter(questions -> !questions.isEmpty())
          .orElseGet(agent::getSuggestedQuestions);
    }
    return agent.getSuggestedQuestions();
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

  /**
   * Resolución ligera para activos públicos sin datos sensibles (avatar, como
   * {@code widget.js}): sin chequeo de {@code Origin}. Un {@code <img>} normal
   * no manda cabecera Origin, así que exigirla dejaría el logo siempre roto —
   * tanto en la vista previa del panel como en el propio widget del cliente.
   */
  private AgentDeployment resolveForAsset(String publicId) {
    AgentDeployment deployment = deploymentRepository
        .findByPublicId(publicId == null ? "" : publicId.trim())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.deploymentNotFound"));
    if (deployment.getStatus() != DeploymentStatus.ACTIVE
        || deployment.getChannelType() != DeploymentChannelType.WEB_CHAT) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "error.deploymentNotFound");
    }
    return deployment;
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
