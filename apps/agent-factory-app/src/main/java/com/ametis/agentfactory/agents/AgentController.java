package com.ametis.agentfactory.agents;

import com.ametis.agentfactory.access.AccessGuard;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/v1", "/api/agent-factory"})
public class AgentController {
  private final AccessGuard accessGuard;
  private final AgentService agentService;

  public AgentController(AccessGuard accessGuard, AgentService agentService) {
    this.accessGuard = accessGuard;
    this.agentService = agentService;
  }

  @GetMapping("/agents")
  public List<AgentResponse> list(JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_READ);
    return agentService.list(tenantId);
  }

  @PostMapping("/agents")
  public ResponseEntity<AgentResponse> create(
      @Valid @RequestBody AgentRequest request,
      JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_MANAGE);
    AgentResponse response = agentService.create(tenantId, accessGuard.currentUserId(authentication), request);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @PatchMapping("/agents/{agentId}")
  public AgentResponse update(
      @PathVariable UUID agentId,
      @Valid @RequestBody AgentRequest request,
      JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_MANAGE);
    return agentService.update(tenantId, agentId, request);
  }

  @DeleteMapping("/agents/{agentId}")
  public ResponseEntity<Void> delete(
      @PathVariable UUID agentId,
      JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_MANAGE);
    agentService.delete(tenantId, agentId);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/agents/{agentId}/publish")
  public AgentResponse publish(
      @PathVariable UUID agentId,
      JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_MANAGE);
    return agentService.publish(tenantId, agentId);
  }

  @PostMapping("/agents/{agentId}/indexing-jobs")
  public AmetisAiCreateIndexingJobsResponse requestIndexing(
      @PathVariable UUID agentId,
      JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_MANAGE);
    return agentService.requestIndexing(tenantId, agentId, accessGuard.currentUserId(authentication));
  }

  @GetMapping("/agents/{agentId}/indexing-jobs/latest")
  public List<AgentIndexingJobResponse> latestIndexingJobs(
      @PathVariable UUID agentId,
      JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_READ);
    return agentService.latestIndexingJobs(tenantId, agentId);
  }

  @PostMapping("/agents/{agentId}/test")
  public AgentTestResponse testAgent(
      @PathVariable UUID agentId,
      @Valid @RequestBody AgentTestRequest request,
      JwtAuthenticationToken authentication) {
    UUID tenantId = accessGuard.requireAccess(authentication, AccessGuard.DOCUMENTS_READ);
    return agentService.testAgent(tenantId, agentId, request);
  }
}
