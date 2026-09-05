package com.ametis.agentfactory.deployments;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PublicQueryRequest(
    @NotBlank @Size(max = 500) String question) {}
