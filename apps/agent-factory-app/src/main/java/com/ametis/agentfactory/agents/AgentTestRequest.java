package com.ametis.agentfactory.agents;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AgentTestRequest(
    @NotBlank @Size(max = 1000) String question) {}
