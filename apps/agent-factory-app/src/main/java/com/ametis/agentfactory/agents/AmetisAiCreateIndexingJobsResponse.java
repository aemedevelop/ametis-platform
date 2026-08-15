package com.ametis.agentfactory.agents;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record AmetisAiCreateIndexingJobsResponse(
    String status,
    @JsonProperty("tenant_id")
    String tenantId,
    @JsonProperty("agent_id")
    String agentId,
    List<AgentIndexingJobResponse> jobs) {}
