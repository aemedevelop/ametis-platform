package com.ametis.agentfactory.agents;

import java.util.List;
import java.util.UUID;

public record AmetisAiAgentSyncPayload(
    String tenantId,
    String businessId,
    UUID sourceTenantId,
    UUID agentId,
    String name,
    String description,
    String persona,
    String targetAudience,
    String tone,
    String responseLanguage,
    String instructions,
    AgentStatus status,
    String publishedAt,
    String updatedAt,
    List<AmetisAiKnowledgeBaseSyncPayload> knowledgeBases) {}
