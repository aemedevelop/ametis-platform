package com.ametis.agentfactory.agents;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record AmetisAiQueryResponse(
    @JsonProperty("tenant_id")
    String tenantId,
    String question,
    String answer,
    @JsonProperty("response_type")
    String responseType,
    @JsonProperty("prebuilt_key")
    String prebuiltKey,
    List<String> suggestions) {}
