package com.ametis.coreapi.service;

import com.ametis.coreapi.api.dto.CreateMembershipRequest;
import com.ametis.coreapi.domain.RoleEntity;
import com.ametis.coreapi.domain.UserTenantEntity;
import com.ametis.coreapi.domain.UserTenantId;
import com.ametis.coreapi.repository.RoleRepository;
import com.ametis.coreapi.repository.UserRepository;
import com.ametis.coreapi.repository.UserTenantRepository;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MembershipService {
  private static final Set<String> MANAGEMENT_ROLES = Set.of("OWNER", "ADMIN");

  private final UserTenantRepository userTenantRepository;
  private final RoleRepository roleRepository;
  private final UserRepository userRepository;

  public MembershipService(
      UserTenantRepository userTenantRepository,
      RoleRepository roleRepository,
      UserRepository userRepository) {
    this.userTenantRepository = userTenantRepository;
    this.roleRepository = roleRepository;
    this.userRepository = userRepository;
  }

  @Transactional(readOnly = true)
  public List<UserTenantEntity> listMemberships(UUID tenantId, UUID currentUserId) {
    ensureActiveMembership(tenantId, currentUserId);
    return userTenantRepository.findByIdTenantId(tenantId);
  }

  @Transactional
  public UserTenantEntity createOrUpdateMembership(UUID tenantId, UUID currentUserId, CreateMembershipRequest request) {
    UserTenantEntity callerMembership = ensureActiveMembership(tenantId, currentUserId);
    String callerRole = callerMembership.getRole().getCode();
    if (!MANAGEMENT_ROLES.contains(callerRole)) {
      throw new ForbiddenException("Only OWNER or ADMIN can manage memberships.");
    }

    userRepository.findById(request.userId())
        .orElseThrow(() -> new NotFoundException("Target user not found: " + request.userId()));

    RoleEntity role = roleRepository.findByCode(request.roleCode())
        .orElseThrow(() -> new NotFoundException("Role not found: " + request.roleCode()));

    UserTenantEntity membership = userTenantRepository
        .findByIdUserIdAndIdTenantId(request.userId(), tenantId)
        .orElseGet(() -> {
          UserTenantEntity newMembership = new UserTenantEntity();
          newMembership.setId(new UserTenantId(request.userId(), tenantId));
          newMembership.setMembershipStatus("ACTIVE");
          return newMembership;
        });
    membership.setRole(role);
    membership.setMembershipStatus("ACTIVE");
    return userTenantRepository.save(membership);
  }

  public UserTenantEntity ensureActiveMembership(UUID tenantId, UUID userId) {
    UserTenantEntity membership = userTenantRepository
        .findByIdUserIdAndIdTenantId(userId, tenantId)
        .orElseThrow(() -> new ForbiddenException("User is not member of tenant."));
    if (!"ACTIVE".equalsIgnoreCase(membership.getMembershipStatus())) {
      throw new ForbiddenException("Membership is not active.");
    }
    return membership;
  }

  public UserTenantEntity ensureManagementRole(UUID tenantId, UUID userId) {
    UserTenantEntity membership = ensureActiveMembership(tenantId, userId);
    String roleCode = membership.getRole().getCode();
    if (!MANAGEMENT_ROLES.contains(roleCode)) {
      throw new ForbiddenException("Only OWNER or ADMIN can manage tenant data.");
    }
    return membership;
  }
}
