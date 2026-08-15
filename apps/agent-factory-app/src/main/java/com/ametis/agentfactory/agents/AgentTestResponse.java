package com.ametis.agentfactory.agents;

import java.util.List;

public record AgentTestResponse(
    String tenantId,
    String question,
    String answer,
    String responseType,
    List<String> suggestions) {}
