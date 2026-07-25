package com.ametis.coreapi.service;

import com.ametis.coreapi.domain.PlanProductEntity;
import com.ametis.coreapi.domain.ProductEntity;
import com.ametis.coreapi.domain.SubscriptionEntity;
import com.ametis.coreapi.repository.PlanProductRepository;
import com.ametis.coreapi.repository.ProductRepository;
import com.ametis.coreapi.repository.SubscriptionRepository;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductService {
  private final ProductRepository productRepository;
  private final SubscriptionRepository subscriptionRepository;
  private final PlanProductRepository planProductRepository;

  public ProductService(
      ProductRepository productRepository,
      SubscriptionRepository subscriptionRepository,
      PlanProductRepository planProductRepository) {
    this.productRepository = productRepository;
    this.subscriptionRepository = subscriptionRepository;
    this.planProductRepository = planProductRepository;
  }

  @Transactional(readOnly = true)
  public List<ProductEntity> listActiveProducts() {
    return productRepository.findByIsActiveTrue();
  }

  @Transactional(readOnly = true)
  public List<ProductEntity> listProductsForTenant(UUID tenantId) {
    return subscriptionRepository.findByTenantId(tenantId)
        .map(subscription -> planProductRepository.findByPlan_IdAndIsActiveTrue(subscription.getPlan().getId()))
        .orElse(List.of())
        .stream()
        .map(PlanProductEntity::getProduct)
        .filter(product -> product.getIsActive() == null || product.getIsActive())
        .distinct()
        .collect(Collectors.toList());
  }

  @Transactional(readOnly = true)
  public ProductEntity getByCode(String code) {
    return productRepository.findByCode(code)
        .orElseThrow(() -> new NotFoundException("Product not found: " + code));
  }
}
