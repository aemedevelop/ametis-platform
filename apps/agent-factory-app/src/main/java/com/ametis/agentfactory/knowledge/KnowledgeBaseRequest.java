package com.ametis.agentfactory.knowledge;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record KnowledgeBaseRequest(
    @NotBlank @Size(max = 120) String name,
    @Size(max = 1000) String description) {}
