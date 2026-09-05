package com.ametis.agentfactory.agents;

public record AmetisAiIndexingJobRequest(
    String tenantId,
    String businessId,
    String requestedBy) {}
