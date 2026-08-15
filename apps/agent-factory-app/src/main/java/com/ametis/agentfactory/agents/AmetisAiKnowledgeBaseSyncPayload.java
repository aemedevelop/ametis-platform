package com.ametis.agentfactory.agents;

import java.util.UUID;

public record AmetisAiKnowledgeBaseSyncPayload(
    UUID id,
    String name,
    int documentCount) {}
