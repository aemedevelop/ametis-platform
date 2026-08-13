package com.ametis.agentfactory.knowledge;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record KnowledgeBaseRequest(
    @NotBlank @Size(max = 120) String name,
    @Size(max = 1000) String description,
    List<String> documentDriveFileIds) {}
