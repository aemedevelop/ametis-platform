package com.ametis.agentfactory.deployments;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentDeploymentRepository extends JpaRepository<AgentDeployment, UUID> {
  List<AgentDeployment> findAllByTenantIdOrderByUpdatedAtDesc(UUID tenantId);
  Optional<AgentDeployment> findByIdAndTenantId(UUID id, UUID tenantId);
  Optional<AgentDeployment> findByTenantIdAndDeploymentSlugIgnoreCase(UUID tenantId, String deploymentSlug);
  Optional<AgentDeployment> findByPublicId(String publicId);
  boolean existsByTenantIdAndDeploymentSlugIgnoreCase(UUID tenantId, String deploymentSlug);
  boolean existsByTenantIdAndDeploymentSlugIgnoreCaseAndIdNot(UUID tenantId, String deploymentSlug, UUID id);
}
