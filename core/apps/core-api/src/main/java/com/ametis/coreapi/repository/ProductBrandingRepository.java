package com.ametis.coreapi.repository;

import com.ametis.coreapi.domain.ProductBrandingEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductBrandingRepository extends JpaRepository<ProductBrandingEntity, UUID> {
  Optional<ProductBrandingEntity> findByProduct_Code(String code);
}
