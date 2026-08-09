package com.ametis.agentfactory.tenant;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class TenantContextFilter extends OncePerRequestFilter {
  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    try {
      String rawTenantId = request.getHeader("X-Tenant-Id");
      if (rawTenantId != null && !rawTenantId.isBlank()) {
        try {
          TenantContextHolder.set(UUID.fromString(rawTenantId.trim()));
        } catch (IllegalArgumentException ignored) {
          response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid X-Tenant-Id");
          return;
        }
      }
      filterChain.doFilter(request, response);
    } finally {
      TenantContextHolder.clear();
    }
  }
}
