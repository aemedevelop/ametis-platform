package com.ametis.agentfactory.businesses;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BusinessDeletionLogRepository extends JpaRepository<BusinessDeletionLog, UUID> {
}
