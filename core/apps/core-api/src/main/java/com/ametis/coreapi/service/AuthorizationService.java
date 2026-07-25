package com.ametis.coreapi.service;

import com.ametis.coreapi.api.dto.AuthorizationCheckRequest;
import com.ametis.coreapi.api.dto.AuthorizationCheckResponse;
import com.ametis.coreapi.repository.authorization.AuthorizationRepository;
import com.ametis.coreapi.repository.UserTenantRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthorizationService {
  private final AuthorizationRepository authorizationRepository;
  private final UserTenantRepository userTenantRepository;

  public AuthorizationService(
      AuthorizationRepository authorizationRepository,
      UserTenantRepository userTenantRepository) {
    this.authorizationRepository = authorizationRepository;
    this.userTenantRepository = userTenantRepository;
  }

  @Transactional(readOnly = true)
  public AuthorizationCheckResponse check(UUID userId, AuthorizationCheckRequest request) {
    List<String> reasons = new ArrayList<>();
    userTenantRepository.findByIdUserIdAndIdTenantId(userId, request.tenantId()).ifPresentOrElse(membership -> {
      if (!"ACTIVE".equalsIgnoreCase(membership.getMembershipStatus())) {
        reasons.add("membership_not_active");
      }
    }, () -> reasons.add("membership_not_found"));

    if (!reasons.isEmpty()) {
      return new AuthorizationCheckResponse(false, reasons);
    }

    int count = authorizationRepository.countAuthorizationMatches(userId, request.tenantId(), request.permissionCode());
    if (count > 0) {
      return new AuthorizationCheckResponse(true, List.of("allowed"));
    }
    return new AuthorizationCheckResponse(false, List.of("permission_or_plan_not_allowed"));
  }
}
