package com.ametis.coreapi.service;

import com.ametis.coreapi.api.dto.CreateTenantRequest;
import com.ametis.coreapi.domain.PlanEntity;
import com.ametis.coreapi.domain.RoleEntity;
import com.ametis.coreapi.domain.SubscriptionEntity;
import com.ametis.coreapi.domain.TenantEntity;
import com.ametis.coreapi.domain.UserEntity;
import com.ametis.coreapi.domain.UserProductAccessEntity;
import com.ametis.coreapi.domain.UserTenantEntity;
import com.ametis.coreapi.domain.UserTenantId;
import com.ametis.coreapi.repository.PlanProductRepository;
import com.ametis.coreapi.repository.PlanRepository;
import com.ametis.coreapi.repository.RoleRepository;
import com.ametis.coreapi.repository.SubscriptionRepository;
import com.ametis.coreapi.repository.TenantRepository;
import com.ametis.coreapi.repository.UserProductAccessRepository;
import com.ametis.coreapi.repository.UserTenantRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TenantService {
  private final TenantRepository tenantRepository;
  private final UserTenantRepository userTenantRepository;
  private final RoleRepository roleRepository;
  private final SubscriptionRepository subscriptionRepository;
  private final PlanRepository planRepository;
  private final PlanProductRepository planProductRepository;
  private final UserProductAccessRepository userProductAccessRepository;

  public TenantService(
      TenantRepository tenantRepository,
      UserTenantRepository userTenantRepository,
      RoleRepository roleRepository,
      SubscriptionRepository subscriptionRepository,
      PlanRepository planRepository,
      PlanProductRepository planProductRepository,
      UserProductAccessRepository userProductAccessRepository) {
    this.tenantRepository = tenantRepository;
    this.userTenantRepository = userTenantRepository;
    this.roleRepository = roleRepository;
    this.subscriptionRepository = subscriptionRepository;
    this.planRepository = planRepository;
    this.planProductRepository = planProductRepository;
    this.userProductAccessRepository = userProductAccessRepository;
  }

  @Transactional
  public TenantEntity createTenant(CreateTenantRequest request, UserEntity currentUser) {
    TenantEntity tenant = new TenantEntity();
    tenant.setId(UUID.randomUUID());
    tenant.setSlug(request.slug().trim().toLowerCase());
    tenant.setName(request.name().trim());
    tenant.setBusinessProfile(request.businessProfile());
    tenant.setStatus("ACTIVE");
    TenantEntity savedTenant = tenantRepository.save(tenant);

    RoleEntity ownerRole = roleRepository.findByCode("OWNER")
        .orElseThrow(() -> new NotFoundException("OWNER role not found. Seed data missing."));

    UserTenantEntity membership = new UserTenantEntity();
    membership.setId(new UserTenantId(currentUser.getId(), savedTenant.getId()));
    membership.setRole(ownerRole);
    membership.setMembershipStatus("ACTIVE");
    userTenantRepository.save(membership);

    PlanEntity freePlan = planRepository.findByCode("FREE")
        .orElseThrow(() -> new NotFoundException("FREE plan not found. Seed data missing."));

    SubscriptionEntity subscription = new SubscriptionEntity();
    subscription.setId(UUID.randomUUID());
    subscription.setTenantId(savedTenant.getId());
    subscription.setPlan(freePlan);
    subscription.setStatus("ACTIVE");
    subscriptionRepository.save(subscription);

    planProductRepository.findByPlan_IdAndIsActiveTrue(freePlan.getId()).forEach(planProduct -> {
      UserProductAccessEntity access = new UserProductAccessEntity();
      access.setId(UUID.randomUUID());
      access.setUser(currentUser);
      access.setTenantId(savedTenant.getId());
      access.setProduct(planProduct.getProduct());
      access.setRole(ownerRole);
      access.setStatus("ACTIVE");
      access.setGrantedAt(Instant.now());
      userProductAccessRepository.save(access);
    });

    return savedTenant;
  }

  @Transactional(readOnly = true)
  public List<TenantEntity> listTenantsForUser(UUID userId) {
    return tenantRepository.findAllByUserId(userId);
  }
}
