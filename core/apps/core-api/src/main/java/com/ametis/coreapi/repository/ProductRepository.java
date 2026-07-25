package com.ametis.coreapi.repository;

import com.ametis.coreapi.domain.ProductEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<ProductEntity, UUID> {
  Optional<ProductEntity> findByCode(String code);
  Optional<ProductEntity> findByCodeAndIsActiveTrue(String code);
  List<ProductEntity> findByIsActiveTrue();
}
