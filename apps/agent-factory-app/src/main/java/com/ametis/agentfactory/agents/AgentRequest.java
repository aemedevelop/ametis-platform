package com.ametis.agentfactory.agents;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record AgentRequest(
    @NotBlank @Size(max = 80) String name,
    @Size(max = 500) String description,
    @NotBlank @Size(max = 500) String persona,
    @NotBlank @Size(max = 300) String targetAudience,
    @NotBlank @Size(max = 80) String tone,
    @NotBlank @Size(max = 32) String responseLanguage,
    @Size(max = 900) String instructions,
    @Size(max = 50) List<@Size(max = 200) String> suggestedQuestions,
    Map<String, @Size(max = 500) String> assistantTexts,
    Integer suggestedQuestionsCount,
    String suggestedQuestionsOrder,
    List<UUID> knowledgeBaseIds) {}
