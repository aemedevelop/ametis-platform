package com.ametis.coreapi.api;

import com.ametis.coreapi.api.dto.AuthorizationCheckRequest;
import com.ametis.coreapi.api.dto.AuthorizationCheckResponse;
import com.ametis.coreapi.api.dto.CreateMembershipRequest;
import com.ametis.coreapi.api.dto.CreateTenantRequest;
import com.ametis.coreapi.api.dto.MembershipResponse;
import com.ametis.coreapi.api.dto.TenantResponse;
import com.ametis.coreapi.domain.TenantEntity;
import com.ametis.coreapi.domain.UserEntity;
import com.ametis.coreapi.domain.UserTenantEntity;
import com.ametis.coreapi.service.AuthorizationService;
import com.ametis.coreapi.service.MembershipService;
import com.ametis.coreapi.service.TenantService;
import com.ametis.coreapi.service.UserContextService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1")
@Tag(name = "Core", description = "Core endpoints for tenants, memberships and authorization.")
public class CoreController {
  private final UserContextService userContextService;
  private final TenantService tenantService;
  private final MembershipService membershipService;
  private final AuthorizationService authorizationService;

  public CoreController(
      UserContextService userContextService,
      TenantService tenantService,
      MembershipService membershipService,
      AuthorizationService authorizationService) {
    this.userContextService = userContextService;
    this.tenantService = tenantService;
    this.membershipService = membershipService;
    this.authorizationService = authorizationService;
  }

  @GetMapping("/health")
  @Operation(summary = "Health check", description = "Returns service health status.")
  @ApiResponse(responseCode = "200", description = "Service is healthy")
  public ResponseEntity<?> health() {
    return ResponseEntity.ok().body(java.util.Map.of("status", "ok"));
  }

  @PostMapping("/tenants")
  @Operation(summary = "Create tenant", description = "Creates a new tenant and assigns OWNER role to current user.")
  @ApiResponses({
      @ApiResponse(responseCode = "201", description = "Tenant created",
          content = @Content(schema = @Schema(implementation = TenantResponse.class))),
      @ApiResponse(responseCode = "401", description = "Unauthorized"),
      @ApiResponse(responseCode = "400", description = "Validation error",
          content = @Content(schema = @Schema(implementation = com.ametis.coreapi.api.dto.ErrorResponse.class)))
  })
  public ResponseEntity<TenantResponse> createTenant(
      @Valid @RequestBody CreateTenantRequest request,
      JwtAuthenticationToken authentication) {
    UserEntity currentUser = currentUser(authentication.getToken());
    TenantEntity tenant = tenantService.createTenant(request, currentUser);
    return ResponseEntity.status(HttpStatus.CREATED).body(toTenantResponse(tenant));
  }

  @GetMapping("/tenants")
  @Operation(summary = "List tenants", description = "Lists tenants where current user has membership.")
  @ApiResponses({
      @ApiResponse(responseCode = "200", description = "Tenant list returned"),
      @ApiResponse(responseCode = "401", description = "Unauthorized")
  })
  public List<TenantResponse> listTenants(JwtAuthenticationToken authentication) {
    UserEntity currentUser = currentUser(authentication.getToken());
    return tenantService.listTenantsForUser(currentUser.getId()).stream()
        .map(this::toTenantResponse)
        .toList();
  }

  @GetMapping("/tenants/{tenantId}/memberships")
  @Operation(summary = "List memberships", description = "Lists memberships for a tenant if current user belongs to that tenant.")
  @ApiResponses({
      @ApiResponse(responseCode = "200", description = "Membership list returned"),
      @ApiResponse(responseCode = "401", description = "Unauthorized"),
      @ApiResponse(responseCode = "403", description = "Forbidden",
          content = @Content(schema = @Schema(implementation = com.ametis.coreapi.api.dto.ErrorResponse.class)))
  })
  public List<MembershipResponse> listMemberships(
      @Parameter(description = "Tenant identifier", required = true)
      @PathVariable UUID tenantId,
      JwtAuthenticationToken authentication) {
    UserEntity currentUser = currentUser(authentication.getToken());
    return membershipService.listMemberships(tenantId, currentUser.getId()).stream()
        .map(this::toMembershipResponse)
        .toList();
  }

  @PostMapping("/tenants/{tenantId}/memberships")
  @Operation(summary = "Create or update membership", description = "Adds or updates user membership in tenant. Requires OWNER or ADMIN role.")
  @ApiResponses({
      @ApiResponse(responseCode = "201", description = "Membership created or updated",
          content = @Content(schema = @Schema(implementation = MembershipResponse.class))),
      @ApiResponse(responseCode = "401", description = "Unauthorized"),
      @ApiResponse(responseCode = "403", description = "Forbidden",
          content = @Content(schema = @Schema(implementation = com.ametis.coreapi.api.dto.ErrorResponse.class))),
      @ApiResponse(responseCode = "404", description = "User or role not found",
          content = @Content(schema = @Schema(implementation = com.ametis.coreapi.api.dto.ErrorResponse.class)))
  })
  public ResponseEntity<MembershipResponse> createMembership(
      @Parameter(description = "Tenant identifier", required = true)
      @PathVariable UUID tenantId,
      @Valid @RequestBody CreateMembershipRequest request,
      JwtAuthenticationToken authentication) {
    UserEntity currentUser = currentUser(authentication.getToken());
    UserTenantEntity membership = membershipService.createOrUpdateMembership(tenantId, currentUser.getId(), request);
    return ResponseEntity.status(HttpStatus.CREATED).body(toMembershipResponse(membership));
  }

  @PostMapping("/authorization/check")
  @Operation(summary = "Check authorization", description = "Evaluates tenant membership, role permission and plan feature gating.")
  @ApiResponses({
      @ApiResponse(responseCode = "200", description = "Authorization decision returned",
          content = @Content(schema = @Schema(implementation = AuthorizationCheckResponse.class))),
      @ApiResponse(responseCode = "401", description = "Unauthorized")
  })
  public AuthorizationCheckResponse checkAuthorization(
      @Valid @RequestBody AuthorizationCheckRequest request,
      JwtAuthenticationToken authentication) {
    UserEntity currentUser = currentUser(authentication.getToken());
    return authorizationService.check(currentUser.getId(), request);
  }

  private UserEntity currentUser(Jwt jwt) {
    return userContextService.resolveOrCreateCurrentUser(jwt);
  }

  private TenantResponse toTenantResponse(TenantEntity tenant) {
    return new TenantResponse(
        tenant.getId(),
        tenant.getSlug(),
        tenant.getName(),
        tenant.getBusinessProfile(),
        tenant.getStatus());
  }

  private MembershipResponse toMembershipResponse(UserTenantEntity membership) {
    return new MembershipResponse(
        membership.getId().getUserId(),
        membership.getId().getTenantId(),
        membership.getRole().getCode(),
        membership.getMembershipStatus());
  }
}
