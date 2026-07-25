package com.ametis.coreapi.api;

import com.ametis.coreapi.api.dto.ProductAccessCheckResponse;
import com.ametis.coreapi.api.dto.ProductBrandingResponse;
import com.ametis.coreapi.api.dto.ProductResponse;
import com.ametis.coreapi.api.dto.UserProductAccessResponse;
import com.ametis.coreapi.domain.ProductBrandingEntity;
import com.ametis.coreapi.domain.ProductEntity;
import com.ametis.coreapi.domain.UserEntity;
import com.ametis.coreapi.domain.UserProductAccessEntity;
import com.ametis.coreapi.service.MembershipService;
import com.ametis.coreapi.service.ProductAccessService;
import com.ametis.coreapi.service.ProductBrandingService;
import com.ametis.coreapi.service.ProductService;
import com.ametis.coreapi.service.UserContextService;
import com.ametis.coreapi.service.ForbiddenException;
import com.ametis.coreapi.service.NotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1")
@Tag(name = "Products", description = "Product catalog, branding and access resolution.")
public class ProductController {
  private final ProductService productService;
  private final ProductBrandingService productBrandingService;
  private final ProductAccessService productAccessService;
  private final UserContextService userContextService;
  private final MembershipService membershipService;

  public ProductController(
      ProductService productService,
      ProductBrandingService productBrandingService,
      ProductAccessService productAccessService,
      UserContextService userContextService,
      MembershipService membershipService) {
    this.productService = productService;
    this.productBrandingService = productBrandingService;
    this.productAccessService = productAccessService;
    this.userContextService = userContextService;
    this.membershipService = membershipService;
  }

  @GetMapping("/products")
  @Operation(summary = "List products", description = "Returns active products in the catalog.")
  @ApiResponse(responseCode = "200", description = "Product list returned")
  public List<ProductResponse> listProducts() {
    return productService.listActiveProducts().stream()
        .map(this::toProductResponse)
        .toList();
  }

  @GetMapping("/tenants/{tenantId}/products")
  @Operation(summary = "List tenant products", description = "Returns products included in the tenant subscription.")
  @ApiResponses({
      @ApiResponse(responseCode = "200", description = "Tenant products returned"),
      @ApiResponse(responseCode = "401", description = "Unauthorized"),
      @ApiResponse(responseCode = "403", description = "Forbidden")
  })
  public List<ProductResponse> listTenantProducts(
      @PathVariable UUID tenantId,
      JwtAuthenticationToken authentication) {
    UserEntity currentUser = currentUser(authentication.getToken());
    membershipService.ensureActiveMembership(tenantId, currentUser.getId());
    return productService.listProductsForTenant(tenantId).stream()
        .map(this::toProductResponse)
        .toList();
  }

  @GetMapping("/users/{userId}/products")
  @Operation(summary = "List user products", description = "Returns product access records for a user.")
  @ApiResponses({
      @ApiResponse(responseCode = "200", description = "User products returned"),
      @ApiResponse(responseCode = "401", description = "Unauthorized"),
      @ApiResponse(responseCode = "403", description = "Forbidden")
  })
  public List<UserProductAccessResponse> listUserProducts(
      @PathVariable UUID userId,
      JwtAuthenticationToken authentication) {
    UserEntity currentUser = currentUser(authentication.getToken());
    if (!currentUser.getId().equals(userId)) {
      throw new ForbiddenException("Cannot access products for other users.");
    }
    return productAccessService.listAccessForUser(userId).stream()
        .map(this::toAccessResponse)
        .toList();
  }

  @GetMapping("/tenants/{tenantId}/users/{userId}/products")
  @Operation(summary = "List tenant user products", description = "Returns product access for a user within a tenant.")
  @ApiResponses({
      @ApiResponse(responseCode = "200", description = "Tenant user products returned"),
      @ApiResponse(responseCode = "401", description = "Unauthorized"),
      @ApiResponse(responseCode = "403", description = "Forbidden")
  })
  public List<UserProductAccessResponse> listTenantUserProducts(
      @PathVariable UUID tenantId,
      @PathVariable UUID userId,
      JwtAuthenticationToken authentication) {
    UserEntity currentUser = currentUser(authentication.getToken());
    if (!currentUser.getId().equals(userId)) {
      membershipService.ensureManagementRole(tenantId, currentUser.getId());
    } else {
      membershipService.ensureActiveMembership(tenantId, currentUser.getId());
    }
    return productAccessService.listAccessForTenantUser(tenantId, userId).stream()
        .map(this::toAccessResponse)
        .toList();
  }

  @GetMapping("/products/{productCode}/branding")
  @Operation(summary = "Get product branding", description = "Returns branding configuration for a product.")
  @ApiResponses({
      @ApiResponse(responseCode = "200", description = "Branding returned"),
      @ApiResponse(responseCode = "404", description = "Branding not found")
  })
  public ProductBrandingResponse getBranding(@PathVariable String productCode) {
    ProductBrandingEntity branding = productBrandingService.getBranding(productCode);
    return toBrandingResponse(branding);
  }

  @GetMapping("/tenants/{tenantId}/products/{productCode}/access/me")
  @Operation(summary = "Check product access", description = "Checks current user access to a product within a tenant.")
  @ApiResponses({
      @ApiResponse(responseCode = "200", description = "Access decision returned"),
      @ApiResponse(responseCode = "401", description = "Unauthorized"),
      @ApiResponse(responseCode = "403", description = "Forbidden")
  })
  public ProductAccessCheckResponse checkAccess(
      @PathVariable UUID tenantId,
      @PathVariable String productCode,
      JwtAuthenticationToken authentication) {
    UserEntity currentUser = currentUser(authentication.getToken());
    membershipService.ensureActiveMembership(tenantId, currentUser.getId());
    try {
      UserProductAccessEntity access = productAccessService.findAccess(tenantId, currentUser.getId(), productCode);
      String roleCode = access.getRole() != null ? access.getRole().getCode() : null;
      return new ProductAccessCheckResponse(true, "allowed", roleCode, access.getStatus());
    } catch (NotFoundException ex) {
      return new ProductAccessCheckResponse(false, "no_access", null, null);
    }
  }

  private UserEntity currentUser(Jwt jwt) {
    return userContextService.resolveOrCreateCurrentUser(jwt);
  }

  private ProductResponse toProductResponse(ProductEntity product) {
    return new ProductResponse(
        product.getId(),
        product.getCode(),
        product.getInternalName(),
        product.getPublicName(),
        product.getDescription(),
        product.getIsStandalone(),
        product.getShowPlatformBrand(),
        product.getSubdomain(),
        product.getIsActive(),
        product.getCreatedAt());
  }

  private ProductBrandingResponse toBrandingResponse(ProductBrandingEntity branding) {
    return new ProductBrandingResponse(
        branding.getId(),
        branding.getProduct().getCode(),
        branding.getLogoUrl(),
        branding.getThemeConfig(),
        branding.getPrimaryColor(),
        branding.getFaviconUrl(),
        branding.getDomainMode(),
        branding.getCustomDomainEnabled());
  }

  private UserProductAccessResponse toAccessResponse(UserProductAccessEntity access) {
    return new UserProductAccessResponse(
        access.getUser().getId(),
        access.getTenantId(),
        access.getProduct().getCode(),
        access.getRole().getCode(),
        access.getStatus(),
        access.getGrantedAt());
  }
}
