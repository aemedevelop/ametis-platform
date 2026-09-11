package com.ametis.agentfactory.agents;

import java.util.List;

public record AmetisAiSuggestionIndexRequest(
    String tenantId, String businessId, List<AmetisAiSuggestionItem> items) {}
