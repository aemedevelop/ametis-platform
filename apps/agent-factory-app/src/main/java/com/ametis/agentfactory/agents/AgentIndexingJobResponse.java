package com.ametis.agentfactory.agents;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AgentIndexingJobResponse(
    UUID id,
    @JsonProperty("tenant_id")
    String tenantId,
    @JsonProperty("agent_id")
    UUID agentId,
    @JsonProperty("knowledge_base_id")
    UUID knowledgeBaseId,
    String status,
    @JsonProperty("requested_by")
    String requestedBy,
    @JsonProperty("requested_at")
    OffsetDateTime requestedAt,
    @JsonProperty("started_at")
    OffsetDateTime startedAt,
    @JsonProperty("finished_at")
    OffsetDateTime finishedAt,
    int documents,
    int chunks,
    @JsonProperty("error_message")
    String errorMessage) {}
