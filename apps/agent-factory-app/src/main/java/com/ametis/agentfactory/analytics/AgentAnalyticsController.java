package com.ametis.agentfactory.analytics;

import com.ametis.agentfactory.access.AccessGuard;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/v1", "/api/agent-factory"})
public class AgentAnalyticsController {
  private static final int DEFAULT_RANGE_DAYS = 30;

  private final AccessGuard accessGuard;
  private final AgentAnalyticsService analyticsService;

  public AgentAnalyticsController(AccessGuard accessGuard, AgentAnalyticsService analyticsService) {
    this.accessGuard = accessGuard;
    this.analyticsService = analyticsService;
  }

  // Ambos endpoints son a nivel de workspace (tenant): no exigen negocio
  // activo, así el listado cruza todos los negocios y el detalle abre
  // cualquier agente del workspace.
  @GetMapping("/analytics/agents")
  public List<AnalyticsAgentResponse> agents(JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_READ);
    return analyticsService.listAgents(tenantId);
  }

  @GetMapping("/agents/{agentId}/analytics")
  public AgentAnalyticsResponse overview(
      @PathVariable UUID agentId,
      @RequestParam(required = false) OffsetDateTime from,
      @RequestParam(required = false) OffsetDateTime to,
      JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_READ);
    OffsetDateTime rangeTo = to == null ? OffsetDateTime.now() : to;
    OffsetDateTime rangeFrom = from == null ? rangeTo.minusDays(DEFAULT_RANGE_DAYS) : from;
    return analyticsService.overview(tenantId, agentId, rangeFrom, rangeTo);
  }
}
