package com.ametis.agentfactory.agents;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record AgentRequest(
    @NotBlank @Size(max = 120) String name,
    @Size(max = 1000) String description,
    @Size(max = 2000) String instructions,
    List<UUID> knowledgeBaseIds) {}
