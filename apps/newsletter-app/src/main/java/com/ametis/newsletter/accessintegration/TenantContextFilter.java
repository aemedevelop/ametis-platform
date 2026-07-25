package com.ametis.newsletter.accessintegration;

import java.io.IOException;
import java.util.UUID;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class TenantContextFilter extends OncePerRequestFilter {
  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    try {
      String headerTenant = request.getHeader("X-Tenant-Id");
      UUID tenantId = parseTenant(headerTenant);
      if (tenantId == null) {
        tenantId = parseTenantFromToken();
      }
      if (tenantId != null) {
        TenantContextHolder.set(new TenantContext(tenantId));
      }
      filterChain.doFilter(request, response);
    } finally {
      TenantContextHolder.clear();
    }
  }

  private UUID parseTenant(String raw) {
    if (raw == null || raw.isBlank()) return null;
    try {
      return UUID.fromString(raw.trim());
    } catch (IllegalArgumentException ex) {
      return null;
    }
  }

  private UUID parseTenantFromToken() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (!(auth instanceof JwtAuthenticationToken jwtAuth)) return null;
    Jwt jwt = jwtAuth.getToken();
    Object claim = jwt.getClaims().getOrDefault("tenant_id", jwt.getClaims().getOrDefault("tenantId", jwt.getClaims().get("tenant")));
    if (claim == null) return null;
    return parseTenant(String.valueOf(claim));
  }
}