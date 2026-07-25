package com.ametis.coreapi.service;

import com.ametis.coreapi.api.dto.CreateTenantRequest;
import com.ametis.coreapi.domain.ProductEntity;
import com.ametis.coreapi.domain.RoleEntity;
import com.ametis.coreapi.domain.TenantEntity;
import com.ametis.coreapi.domain.UserEntity;
import com.ametis.coreapi.domain.UserProductAccessEntity;
import com.ametis.coreapi.repository.ProductRepository;
import com.ametis.coreapi.repository.RoleRepository;
import com.ametis.coreapi.repository.TenantRepository;
import com.ametis.coreapi.repository.UserProductAccessRepository;
import com.ametis.coreapi.repository.UserTenantRepository;
import java.text.Normalizer;
import java.time.Instant;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RegistrationProvisioningService {
  private static final Logger log = LoggerFactory.getLogger(RegistrationProvisioningService.class);

  private final UserTenantRepository userTenantRepository;
  private final TenantRepository tenantRepository;
  private final TenantService tenantService;
  private final ProductRepository productRepository;
  private final RoleRepository roleRepository;
  private final UserProductAccessRepository userProductAccessRepository;
  private final String defaultProductCode;
  private final String defaultAccessRoleCode;

  public RegistrationProvisioningService(
      UserTenantRepository userTenantRepository,
      TenantRepository tenantRepository,
      TenantService tenantService,
      ProductRepository productRepository,
      RoleRepository roleRepository,
      UserProductAccessRepository userProductAccessRepository,
      @Value("${core.registration.default-product-code:newsletter}") String defaultProductCode,
      @Value("${core.registration.default-product-role:OWNER}") String defaultAccessRoleCode) {
    this.userTenantRepository = userTenantRepository;
    this.tenantRepository = tenantRepository;
    this.tenantService = tenantService;
    this.productRepository = productRepository;
    this.roleRepository = roleRepository;
    this.userProductAccessRepository = userProductAccessRepository;
    this.defaultProductCode = defaultProductCode;
    this.defaultAccessRoleCode = defaultAccessRoleCode;
  }

  @Transactional
  public void provisionInitialWorkspace(UserEntity user) {
    if (userTenantRepository.countByIdUserId(user.getId()) > 0) {
      return;
    }

    CreateTenantRequest tenantRequest = new CreateTenantRequest(
        nextAvailableSlug(user),
        defaultTenantName(user),
        "PYME");
    TenantEntity tenant = tenantService.createTenant(tenantRequest, user);
    grantProductAccessIfPossible(tenant.getId(), user);
  }

  private void grantProductAccessIfPossible(UUID tenantId, UserEntity user) {
    Optional<ProductEntity> product = productRepository.findByCodeAndIsActiveTrue(defaultProductCode)
        .or(() -> productRepository.findByCode(defaultProductCode));
    if (product.isEmpty()) {
      log.warn("Skipping default product access provisioning because product '{}' was not found.", defaultProductCode);
      return;
    }

    RoleEntity accessRole = roleRepository.findByCode(defaultAccessRoleCode)
        .orElseGet(() -> roleRepository.findByCode("OWNER")
            .orElseThrow(() -> new NotFoundException("Role not found for provisioning: " + defaultAccessRoleCode)));

    boolean alreadyGranted = userProductAccessRepository
        .findByTenantIdAndProduct_IdAndUser_Id(tenantId, product.get().getId(), user.getId())
        .isPresent();
    if (alreadyGranted) {
      return;
    }

    UserProductAccessEntity access = new UserProductAccessEntity();
    access.setId(UUID.randomUUID());
    access.setTenantId(tenantId);
    access.setUser(user);
    access.setProduct(product.get());
    access.setRole(accessRole);
    access.setStatus("ACTIVE");
    access.setGrantedAt(Instant.now());
    userProductAccessRepository.save(access);
  }

  private String defaultTenantName(UserEntity user) {
    String base = safeTrim(user.getFullName());
    if (base.isBlank()) {
      base = safeTrim(user.getEmail());
    }
    if (base.isBlank()) {
      base = "Tenant";
    }
    return base + " Workspace";
  }

  private String nextAvailableSlug(UserEntity user) {
    String baseCandidate = emailLocalPart(user.getEmail());
    if (baseCandidate.isBlank()) {
      baseCandidate = user.getFullName();
    }
    String base = normalizeSlug(baseCandidate);
    if (base.isBlank()) {
      base = "tenant";
    }
    if (base.length() > 45) {
      base = base.substring(0, 45).replaceAll("-+$", "");
      if (base.isBlank()) {
        base = "tenant";
      }
    }

    if (!tenantRepository.existsBySlug(base)) {
      return base;
    }
    for (int i = 2; i <= 99; i++) {
      String candidate = base + "-" + i;
      if (!tenantRepository.existsBySlug(candidate)) {
        return candidate;
      }
    }
    return base + "-" + UUID.randomUUID().toString().substring(0, 8);
  }

  private String emailLocalPart(String email) {
    String value = safeTrim(email);
    int at = value.indexOf("@");
    return at > 0 ? value.substring(0, at) : value;
  }

  private String normalizeSlug(String value) {
    String normalized = Normalizer.normalize(safeTrim(value), Normalizer.Form.NFD)
        .replaceAll("\\p{M}+", "")
        .toLowerCase(Locale.ROOT)
        .replaceAll("[^a-z0-9]+", "-")
        .replaceAll("^-+|-+$", "");
    return normalized;
  }

  private String safeTrim(String value) {
    return value == null ? "" : value.trim();
  }
}
