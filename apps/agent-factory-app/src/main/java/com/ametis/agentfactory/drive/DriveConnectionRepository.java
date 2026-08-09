package com.ametis.agentfactory.drive;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DriveConnectionRepository extends JpaRepository<DriveConnection, UUID> {
  Optional<DriveConnection> findByTenantId(UUID tenantId);
}
