package com.ametis.coreapi.service;

import com.ametis.coreapi.domain.ProductEntity;
import com.ametis.coreapi.domain.UserProductAccessEntity;
import com.ametis.coreapi.repository.ProductRepository;
import com.ametis.coreapi.repository.UserProductAccessRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductAccessService {
  private final UserProductAccessRepository accessRepository;
  private final ProductRepository productRepository;

  public ProductAccessService(
      UserProductAccessRepository accessRepository,
      ProductRepository productRepository) {
    this.accessRepository = accessRepository;
    this.productRepository = productRepository;
  }

  @Transactional(readOnly = true)
  public List<UserProductAccessEntity> listAccessForUser(UUID userId) {
    return accessRepository.findByUser_Id(userId);
  }

  @Transactional(readOnly = true)
  public List<UserProductAccessEntity> listAccessForTenantUser(UUID tenantId, UUID userId) {
    return accessRepository.findByTenantIdAndUser_Id(tenantId, userId);
  }

  @Transactional(readOnly = true)
  public UserProductAccessEntity findAccess(UUID tenantId, UUID userId, String productCode) {
    ProductEntity product = productRepository.findByCode(productCode)
        .orElseThrow(() -> new NotFoundException("Product not found: " + productCode));
    return accessRepository.findByTenantIdAndProduct_IdAndUser_Id(tenantId, product.getId(), userId)
        .orElseThrow(() -> new NotFoundException("Access not found for product: " + productCode));
  }
}
