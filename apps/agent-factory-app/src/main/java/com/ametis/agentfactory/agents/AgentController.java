package com.ametis.agentfactory.agents;

import com.ametis.agentfactory.access.AccessGuard;
import com.ametis.agentfactory.businesses.Business;
import com.ametis.agentfactory.businesses.BusinessService;
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
  private final BusinessService businessService;
  private final AgentService agentService;

  public AgentController(AccessGuard accessGuard, BusinessService businessService, AgentService agentService) {
    this.accessGuard = accessGuard;
    this.businessService = businessService;
    this.agentService = agentService;
  }

  private Business business(JwtAuthenticationToken authentication, String permission) {
    UUID tenantId = accessGuard.requireAccess(authentication, permission);
    return businessService.require(tenantId, accessGuard.requireBusinessId());
  }

  @GetMapping("/agents")
  public List<AgentResponse> list(JwtAuthenticationToken authentication) {
    return agentService.list(business(authentication, AccessGuard.DOCUMENTS_READ));
  }

  @PostMapping("/agents")
  public ResponseEntity<AgentResponse> create(
      @Valid @RequestBody AgentRequest request,
      JwtAuthenticationToken authentication) {
    Business business = business(authentication, AccessGuard.DOCUMENTS_MANAGE);
    AgentResponse response = agentService.create(business, accessGuard.currentUserId(authentication), request);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @PatchMapping("/agents/{agentId}")
  public AgentResponse update(
      @PathVariable UUID agentId,
      @Valid @RequestBody AgentRequest request,
      JwtAuthenticationToken authentication) {
    return agentService.update(business(authentication, AccessGuard.DOCUMENTS_MANAGE), agentId, request);
  }

  @DeleteMapping("/agents/{agentId}")
  public ResponseEntity<Void> delete(
      @PathVariable UUID agentId,
      JwtAuthenticationToken authentication) {
    agentService.delete(business(authentication, AccessGuard.DOCUMENTS_MANAGE), agentId);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/agents/{agentId}/publish")
  public AgentResponse publish(
      @PathVariable UUID agentId,
      JwtAuthenticationToken authentication) {
    return agentService.publish(business(authentication, AccessGuard.DOCUMENTS_MANAGE), agentId);
  }

  @PostMapping("/agents/{agentId}/indexing-jobs")
  public AmetisAiCreateIndexingJobsResponse requestIndexing(
      @PathVariable UUID agentId,
      JwtAuthenticationToken authentication) {
    return agentService.requestIndexing(
        business(authentication, AccessGuard.DOCUMENTS_MANAGE), agentId, accessGuard.currentUserId(authentication));
  }

  @GetMapping("/agents/{agentId}/indexing-jobs/latest")
  public List<AgentIndexingJobResponse> latestIndexingJobs(
      @PathVariable UUID agentId,
      JwtAuthenticationToken authentication) {
    return agentService.latestIndexingJobs(business(authentication, AccessGuard.DOCUMENTS_READ), agentId);
  }

  @PostMapping("/agents/{agentId}/test")
  public AgentTestResponse testAgent(
      @PathVariable UUID agentId,
      @Valid @RequestBody AgentTestRequest request,
      JwtAuthenticationToken authentication) {
    return agentService.testAgent(business(authentication, AccessGuard.DOCUMENTS_READ), agentId, request);
  }
}
