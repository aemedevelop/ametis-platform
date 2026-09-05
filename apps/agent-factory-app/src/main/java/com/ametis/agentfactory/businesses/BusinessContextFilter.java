package com.ametis.agentfactory.businesses;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class BusinessContextFilter extends OncePerRequestFilter {
  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    try {
      String rawBusinessId = request.getHeader("X-Business-Id");
      if (rawBusinessId != null && !rawBusinessId.isBlank()) {
        try {
          BusinessContextHolder.set(UUID.fromString(rawBusinessId.trim()));
        } catch (IllegalArgumentException ignored) {
          response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid X-Business-Id");
          return;
        }
      }
      filterChain.doFilter(request, response);
    } finally {
      BusinessContextHolder.clear();
    }
  }
}
