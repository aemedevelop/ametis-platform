package com.ametis.agentfactory.analytics;

import com.ametis.agentfactory.analytics.AgentAnalyticsAccessService.ClientContext;
import com.ametis.agentfactory.analytics.AgentAnalyticsAccessService.LoginRequest;
import com.ametis.agentfactory.analytics.AgentAnalyticsAccessService.SessionResponse;
import java.time.OffsetDateTime;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Analíticas de un agente para su cliente final. Va por el canal público (sin
 * JWT de la plataforma): la sesión es propia y viaja en X-Analytics-Session,
 * no en Authorization, que el resource server intentaría validar como JWT.
 */
@RestController
@RequestMapping({"/v1/public/analytics", "/api/agent-factory/public/analytics"})
public class PublicAnalyticsController {
  static final String SESSION_HEADER = "X-Analytics-Session";

  private final AgentAnalyticsAccessService accessService;
  private final AgentAnalyticsService analyticsService;
  private final AgentAnalyticsExporter exporter;

  public PublicAnalyticsController(
      AgentAnalyticsAccessService accessService,
      AgentAnalyticsService analyticsService,
      AgentAnalyticsExporter exporter) {
    this.accessService = accessService;
    this.analyticsService = analyticsService;
    this.exporter = exporter;
  }

  @PostMapping("/{publicId}/login")
  public SessionResponse login(@PathVariable String publicId, @RequestBody LoginRequest request) {
    return accessService.login(publicId, request);
  }

  @GetMapping("/{publicId}/overview")
  public AgentAnalyticsResponse overview(
      @PathVariable String publicId,
      @RequestParam(required = false) OffsetDateTime from,
      @RequestParam(required = false) OffsetDateTime to,
      @RequestHeader(value = SESSION_HEADER, required = false) String session) {
    ClientContext context = accessService.authorize(publicId, session);
    OffsetDateTime rangeTo = AgentAnalyticsController.rangeTo(to);
    return analyticsService.overview(
        context.tenantId(), context.agentId(), AgentAnalyticsController.rangeFrom(from, rangeTo), rangeTo);
  }

  @GetMapping("/{publicId}/export")
  public ResponseEntity<byte[]> export(
      @PathVariable String publicId,
      @RequestParam(required = false) OffsetDateTime from,
      @RequestParam(required = false) OffsetDateTime to,
      @RequestParam(required = false, defaultValue = "es") String lang,
      @RequestHeader(value = SESSION_HEADER, required = false) String session) {
    ClientContext context = accessService.authorize(publicId, session);
    OffsetDateTime rangeTo = AgentAnalyticsController.rangeTo(to);
    OffsetDateTime rangeFrom = AgentAnalyticsController.rangeFrom(from, rangeTo);
    AgentAnalyticsResponse data = analyticsService.overview(context.tenantId(), context.agentId(), rangeFrom, rangeTo);
    return AgentAnalyticsController.xlsxResponse(exporter, data, context.agentName(), lang);
  }
}
