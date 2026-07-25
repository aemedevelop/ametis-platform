package com.ametis.coreapi.repository;

import com.ametis.coreapi.domain.PlanProductEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlanProductRepository extends JpaRepository<PlanProductEntity, UUID> {
  List<PlanProductEntity> findByPlan_Id(UUID planId);
  List<PlanProductEntity> findByPlan_IdAndIsActiveTrue(UUID planId);
}
