package com.ametis.coreapi.service;

import com.ametis.coreapi.domain.ProductBrandingEntity;
import com.ametis.coreapi.repository.ProductBrandingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductBrandingService {
  private final ProductBrandingRepository brandingRepository;

  public ProductBrandingService(ProductBrandingRepository brandingRepository) {
    this.brandingRepository = brandingRepository;
  }

  @Transactional(readOnly = true)
  public ProductBrandingEntity getBranding(String productCode) {
    return brandingRepository.findByProduct_Code(productCode)
        .orElseThrow(() -> new NotFoundException("Branding not found for product: " + productCode));
  }
}
