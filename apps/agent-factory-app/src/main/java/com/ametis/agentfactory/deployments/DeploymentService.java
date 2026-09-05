package com.ametis.agentfactory.deployments;

import com.ametis.agentfactory.agents.AgentDefinition;
import com.ametis.agentfactory.agents.AgentRepository;
import com.ametis.agentfactory.agents.AgentStatus;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DeploymentService {
  private final AgentDeploymentRepository deploymentRepository;
  private final AgentRepository agentRepository;
  private final DeploymentEndpoints deploymentEndpoints;

  public DeploymentService(
      AgentDeploymentRepository deploymentRepository,
      AgentRepository agentRepository,
      DeploymentEndpoints deploymentEndpoints) {
    this.deploymentRepository = deploymentRepository;
    this.agentRepository = agentRepository;
    this.deploymentEndpoints = deploymentEndpoints;
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
    return normalized.substring(0, Math.min(normalized.length(), 80));
  }
}
