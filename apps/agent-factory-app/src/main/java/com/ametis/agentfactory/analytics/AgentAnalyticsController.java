package com.ametis.agentfactory.analytics;

import com.ametis.agentfactory.access.AccessGuard;
import com.ametis.agentfactory.analytics.AgentAnalyticsAccessService.AccessRequest;
import com.ametis.agentfactory.analytics.AgentAnalyticsAccessService.AccessResponse;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/v1", "/api/agent-factory"})
public class AgentAnalyticsController {
  private static final int DEFAULT_RANGE_DAYS = 30;

  private final AccessGuard accessGuard;
  private final AgentAnalyticsService analyticsService;

  private final AgentAnalyticsExporter exporter;
  private final AgentAnalyticsAccessService accessService;

  public AgentAnalyticsController(
      AccessGuard accessGuard,
      AgentAnalyticsService analyticsService,
      AgentAnalyticsExporter exporter,
      AgentAnalyticsAccessService accessService) {
    this.accessService = accessService;
    this.accessGuard = accessGuard;
    this.analyticsService = analyticsService;
    this.exporter = exporter;
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
    OffsetDateTime rangeTo = rangeTo(to);
    return analyticsService.overview(tenantId, agentId, rangeFrom(from, rangeTo), rangeTo);
  }

  /** El mismo contenido del dashboard, en un Excel con una hoja por bloque. */
  @GetMapping("/agents/{agentId}/analytics/export")
  public ResponseEntity<byte[]> export(
      @PathVariable UUID agentId,
      @RequestParam(required = false) OffsetDateTime from,
      @RequestParam(required = false) OffsetDateTime to,
      @RequestParam(required = false, defaultValue = "es") String lang,
      JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_READ);
    OffsetDateTime rangeTo = rangeTo(to);
    AgentAnalyticsResponse data = analyticsService.overview(tenantId, agentId, rangeFrom(from, rangeTo), rangeTo);
    return xlsxResponse(exporter, data, analyticsService.agentName(tenantId, agentId), lang);
  }

  /** Acceso de cliente a las analíticas de este agente (ver AgentAnalyticsAccessService). */
  @GetMapping("/agents/{agentId}/analytics/access")
  public AccessResponse access(@PathVariable UUID agentId, JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_READ);
    return accessService.get(tenantId, agentId);
  }

  @PostMapping("/agents/{agentId}/analytics/access")
  public AccessResponse saveAccess(
      @PathVariable UUID agentId,
      @RequestBody AccessRequest request,
      JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_MANAGE);
    return accessService.save(tenantId, agentId, request);
  }

  static OffsetDateTime rangeTo(OffsetDateTime to) {
    return to == null ? OffsetDateTime.now() : to;
  }

  static OffsetDateTime rangeFrom(OffsetDateTime from, OffsetDateTime rangeTo) {
    return from == null ? rangeTo.minusDays(DEFAULT_RANGE_DAYS) : from;
  }

  static ResponseEntity<byte[]> xlsxResponse(
      AgentAnalyticsExporter exporter, AgentAnalyticsResponse data, String agentName, String lang) {
    String filename = "analiticas-" + agentName.replaceAll("[\\\\/:*?\"<>|\\s]+", "-") + "-"
        + data.from().toLocalDate() + "_" + data.to().toLocalDate() + ".xlsx";
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment().filename(filename, StandardCharsets.UTF_8).build().toString())
        .body(exporter.toXlsx(data, agentName, lang));
  }
}
