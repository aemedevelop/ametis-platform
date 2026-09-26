package com.ametis.agentfactory.deployments;

import com.ametis.agentfactory.agents.AgentDefinition;
import com.ametis.agentfactory.agents.AgentRepository;
import com.ametis.agentfactory.agents.AgentStatus;
import com.ametis.agentfactory.documents.RepositoryBinding;
import com.ametis.agentfactory.documents.RepositoryBindingRepository;
import com.ametis.agentfactory.storage.StorageProvider;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DeploymentService {
  private static final long MAX_AVATAR_BYTES = 2 * 1024 * 1024;
  private static final Set<String> SUPPORTED_AVATAR_TYPES =
      Set.of("image/png", "image/jpeg", "image/webp", "image/svg+xml");

  /**
   * Slug reservado del despliegue de prueba interno: uno por tenant, fijo,
   * autoaprovisionado. No es seleccionable al crear un despliegue normal
   * (ver {@link #normalizeSlug}).
   */
  static final String WORKSPACE_TEST_SLUG = "workspace-test";

  private final AgentDeploymentRepository deploymentRepository;
  private final AgentRepository agentRepository;
  private final DeploymentEndpoints deploymentEndpoints;
  private final StorageProvider storageProvider;
  private final RepositoryBindingRepository repositoryBindingRepository;
  private final String platformWebOrigin;

  public DeploymentService(
      AgentDeploymentRepository deploymentRepository,
      AgentRepository agentRepository,
      DeploymentEndpoints deploymentEndpoints,
      StorageProvider storageProvider,
      RepositoryBindingRepository repositoryBindingRepository,
      @Value("${agent-factory.public.web-app-origin:}") String platformWebOrigin) {
    this.deploymentRepository = deploymentRepository;
    this.agentRepository = agentRepository;
    this.deploymentEndpoints = deploymentEndpoints;
    this.storageProvider = storageProvider;
    this.repositoryBindingRepository = repositoryBindingRepository;
    this.platformWebOrigin = platformWebOrigin == null ? "" : platformWebOrigin.trim();
  }

  private DeploymentResponse toResponse(AgentDeployment deployment, AgentDefinition agent) {
    return DeploymentResponse.from(deployment, agent, deploymentEndpoints.describe(deployment));
  }

  public List<DeploymentResponse> list(UUID tenantId) {
    List<AgentDeployment> deployments = deploymentRepository.findAllByTenantIdOrderByUpdatedAtDesc(tenantId);
    if (deployments.isEmpty()) {
      return List.of();
    }
    List<UUID> agentIds = deployments.stream().map(AgentDeployment::getAgentId).distinct().toList();
    Map<UUID, AgentDefinition> agentsById = agentRepository.findAllById(agentIds).stream()
        .filter(agent -> agent.getTenantId().equals(tenantId))
        .collect(Collectors.toMap(AgentDefinition::getId, Function.identity()));
    return deployments.stream()
        .map(deployment -> toResponse(deployment, agentsById.get(deployment.getAgentId())))
        .toList();
  }

  @Transactional
  public DeploymentResponse create(UUID tenantId, UUID userId, DeploymentRequest request) {
    AgentDefinition agent = requireReadyAgent(tenantId, request.agentId());
    String name = requireText(request.name(), "error.deploymentNameRequired");
    String slug = normalizeSlug(request.deploymentSlug());
    if (deploymentRepository.existsByTenantIdAndDeploymentSlugIgnoreCase(tenantId, slug)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.deploymentSlugTaken");
    }
    AgentDeployment deployment = AgentDeployment.create(
        tenantId,
        agent.getId(),
        name,
        request.channelType(),
        slug,
        cleanOptional(request.apiKey()),
        cleanOptional(request.welcomeMessage()),
        request.rateLimitPerMinute(),
        request.rateLimitPerDay(),
        DeploymentOrigins.normalize(request.allowedOrigins()),
        userId);
    return toResponse(deploymentRepository.save(deployment), agent);
  }

  @Transactional
  public DeploymentResponse update(UUID tenantId, UUID deploymentId, DeploymentRequest request) {
    AgentDeployment deployment = deploymentRepository.findByIdAndTenantId(deploymentId, tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.deploymentNotFound"));
    AgentDefinition agent = requireReadyAgent(tenantId, request.agentId());
    String name = requireText(request.name(), "error.deploymentNameRequired");
    String slug = normalizeSlug(request.deploymentSlug());
    if (deploymentRepository.existsByTenantIdAndDeploymentSlugIgnoreCaseAndIdNot(tenantId, slug, deploymentId)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.deploymentSlugTaken");
    }
    deployment.update(
        agent.getId(),
        name,
        request.channelType(),
        slug,
        request.status() == null ? DeploymentStatus.ACTIVE : request.status(),
        request.apiKey() == null ? deployment.getApiKey() : cleanOptional(request.apiKey()),
        cleanOptional(request.welcomeMessage()),
        request.rateLimitPerMinute(),
        request.rateLimitPerDay(),
        DeploymentOrigins.normalize(request.allowedOrigins()));
    return toResponse(deploymentRepository.save(deployment), agent);
  }

  @Transactional
  public DeploymentResponse updateAppearance(UUID tenantId, UUID deploymentId, DeploymentTheme theme) {
    AgentDeployment deployment = deploymentRepository.findByIdAndTenantId(deploymentId, tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.deploymentNotFound"));
    deployment.applyAppearance(theme);
    AgentDefinition agent = agentRepository.findByIdAndTenantId(deployment.getAgentId(), tenantId).orElse(null);
    return toResponse(deploymentRepository.save(deployment), agent);
  }

  @Transactional
  public DeploymentResponse uploadAvatar(UUID tenantId, UUID deploymentId, MultipartFile file) {
    AgentDeployment deployment = deploymentRepository.findByIdAndTenantId(deploymentId, tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.deploymentNotFound"));
    validateAvatar(file);
    RepositoryBinding binding = repositoryBindingRepository.findByTenantId(tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "error.repositoryNotActive"));
    String previousKey = deployment.getThemeAvatarKey();
    try {
      String container = storageProvider.provisionContainer(
          tenantId, binding.getWorkspaceLocator(), "branding", Map.of("purpose", "branding"));
      String mimeType = file.getContentType() == null ? "application/octet-stream" : file.getContentType();
      StorageProvider.StoredObject stored = storageProvider.putObject(
          tenantId,
          container,
          "avatar-" + deploymentId,
          mimeType,
          file.getBytes(),
          Map.of("deploymentId", deploymentId.toString(), "purpose", "avatar"));
      deployment.applyAvatar(stored.key());
      AgentDefinition agent = agentRepository.findByIdAndTenantId(deployment.getAgentId(), tenantId).orElse(null);
      DeploymentResponse response = toResponse(deploymentRepository.save(deployment), agent);
      if (previousKey != null && !previousKey.equals(stored.key())) {
        deleteAvatarObjectQuietly(tenantId, previousKey);
      }
      return response;
    } catch (ResponseStatusException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "error.storageUploadFailed", exception);
    }
  }

  @Transactional
  public DeploymentResponse deleteAvatar(UUID tenantId, UUID deploymentId) {
    AgentDeployment deployment = deploymentRepository.findByIdAndTenantId(deploymentId, tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.deploymentNotFound"));
    String key = deployment.getThemeAvatarKey();
    if (key != null) {
      deleteAvatarObjectQuietly(tenantId, key);
      deployment.applyAvatar(null);
    }
    AgentDefinition agent = agentRepository.findByIdAndTenantId(deployment.getAgentId(), tenantId).orElse(null);
    return toResponse(deploymentRepository.save(deployment), agent);
  }

  private void deleteAvatarObjectQuietly(UUID tenantId, String key) {
    try {
      storageProvider.deleteObject(tenantId, key);
    } catch (Exception ignored) {
      // El objeto viejo puede haber desaparecido ya; no bloquea la operación.
    }
  }

  private void validateAvatar(MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "error.deploymentAvatarRequired");
    }
    if (file.getSize() > MAX_AVATAR_BYTES) {
      throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "error.deploymentAvatarTooLarge");
    }
    String type = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
    if (!SUPPORTED_AVATAR_TYPES.contains(type)) {
      throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "error.deploymentAvatarUnsupportedType");
    }
  }

  @Transactional
  public DeploymentResponse regeneratePublicId(UUID tenantId, UUID deploymentId) {
    AgentDeployment deployment = deploymentRepository.findByIdAndTenantId(deploymentId, tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.deploymentNotFound"));
    deployment.regeneratePublicId();
    AgentDefinition agent = agentRepository.findByIdAndTenantId(deployment.getAgentId(), tenantId).orElse(null);
    return toResponse(deploymentRepository.save(deployment), agent);
  }

  public void delete(UUID tenantId, UUID deploymentId) {
    AgentDeployment deployment = deploymentRepository.findByIdAndTenantId(deploymentId, tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.deploymentNotFound"));
    deploymentRepository.delete(deployment);
  }

  private AgentDefinition requireReadyAgent(UUID tenantId, UUID agentId) {
    AgentDefinition agent = agentRepository.findByIdAndTenantId(agentId, tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "error.deploymentInvalidAgent"));
    if (agent.getStatus() != AgentStatus.READY) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.deploymentRequiresPublishedAgent");
    }
    return agent;
  }

  private String requireText(String value, String errorCode) {
    String clean = cleanOptional(value);
    if (clean == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, errorCode);
    }
    return clean;
  }

  private String cleanOptional(String value) {
    String clean = value == null ? null : value.trim();
    return clean == null || clean.isBlank() ? null : clean;
  }

  private String normalizeSlug(String value) {
    String clean = requireText(value, "error.deploymentSlugRequired");
    String normalized = Normalizer.normalize(clean, Normalizer.Form.NFD)
        .replaceAll("\\p{M}", "")
        .toLowerCase(Locale.ROOT)
        .replaceAll("[^a-z0-9]+", "-")
        .replaceAll("^-+|-+$", "");
    if (normalized.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "error.deploymentSlugRequired");
    }
    if (normalized.equals(WORKSPACE_TEST_SLUG)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "error.deploymentSlugReserved");
    }
    return normalized.substring(0, Math.min(normalized.length(), 80));
  }

  /**
   * Devuelve el despliegue de prueba fijo del workspace (uno por tenant,
   * siempre el mismo {@code publicId}), creándolo la primera vez que se pide.
   * Se sirve por el mismo camino público que cualquier despliegue real -- la
   * única diferencia es que sus "orígenes permitidos" ya incluyen el propio
   * dominio de la plataforma, para que el widget cargado dentro de la propia
   * app pase el chequeo de {@code Origin} sin trato especial. Nace publicado
   * (no en borrador) porque su único propósito es responder de verdad.
   *
   * <p>Si se indica {@code requestedAgentId} (el agente que el usuario tiene
   * seleccionado en ese momento en el formulario de alta/edición), el
   * despliegue se reapunta a ese agente en caliente -- así el widget, con el
   * mismo {@code publicId} de siempre, siempre conversa con el agente que se
   * está probando en el formulario.
   */
  @Transactional
  public DeploymentResponse getOrCreateWorkspaceTestDeployment(UUID tenantId, UUID userId, UUID requestedAgentId) {
    AgentDeployment existing = deploymentRepository
        .findByTenantIdAndDeploymentSlugIgnoreCase(tenantId, WORKSPACE_TEST_SLUG)
        .orElse(null);

    AgentDefinition agent;
    if (requestedAgentId != null) {
      agent = requireReadyAgent(tenantId, requestedAgentId);
    } else if (existing != null) {
      agent = agentRepository.findByIdAndTenantId(existing.getAgentId(), tenantId).orElse(null);
    } else {
      agent = agentRepository
          .findFirstByTenantIdAndStatusOrderByUpdatedAtDesc(tenantId, AgentStatus.READY)
          .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "error.workspaceTestRequiresReadyAgent"));
    }

    if (existing != null) {
      if (agent != null && !existing.getAgentId().equals(agent.getId())) {
        existing.repointAgent(agent.getId());
        existing = deploymentRepository.save(existing);
      }
      return toResponse(existing, agent);
    }

    if (platformWebOrigin.isBlank()) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.workspaceTestOriginNotConfigured");
    }
    AgentDeployment deployment = AgentDeployment.create(
        tenantId,
        agent.getId(),
        "Chat de prueba del workspace",
        DeploymentChannelType.WEB_CHAT,
        WORKSPACE_TEST_SLUG,
        null,
        null,
        null,
        null,
        DeploymentOrigins.normalize(List.of(platformWebOrigin)),
        userId);
    deployment.activate();
    return toResponse(deploymentRepository.save(deployment), agent);
  }
}
