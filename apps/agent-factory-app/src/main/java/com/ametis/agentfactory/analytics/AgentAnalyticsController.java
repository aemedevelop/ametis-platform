package com.ametis.agentfactory.analytics;

import com.ametis.agentfactory.access.AccessGuard;
import com.ametis.agentfactory.businesses.Business;
import com.ametis.agentfactory.businesses.BusinessService;
import java.time.OffsetDateTime;
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
  private final BusinessService businessService;
  private final AgentAnalyticsService analyticsService;

  public AgentAnalyticsController(
      AccessGuard accessGuard, BusinessService businessService, AgentAnalyticsService analyticsService) {
    this.accessGuard = accessGuard;
    this.businessService = businessService;
    this.analyticsService = analyticsService;
  }

  @GetMapping("/agents/{agentId}/analytics")
  public AgentAnalyticsResponse overview(
      @PathVariable UUID agentId,
      @RequestParam(required = false) OffsetDateTime from,
      @RequestParam(required = false) OffsetDateTime to,
      JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_READ);
    Business business = businessService.require(tenantId, accessGuard.requireBusinessId());
    OffsetDateTime rangeTo = to == null ? OffsetDateTime.now() : to;
    OffsetDateTime rangeFrom = from == null ? rangeTo.minusDays(DEFAULT_RANGE_DAYS) : from;
    return analyticsService.overview(business, agentId, rangeFrom, rangeTo);
  }
}
