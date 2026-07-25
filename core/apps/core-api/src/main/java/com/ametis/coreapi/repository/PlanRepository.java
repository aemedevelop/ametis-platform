package com.ametis.coreapi.repository;

import com.ametis.coreapi.domain.PlanEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlanRepository extends JpaRepository<PlanEntity, UUID> {
  Optional<PlanEntity> findByCode(String code);
}
