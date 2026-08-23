package com.ametis.agentfactory.deployments;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record DeploymentRequest(
    @NotNull UUID agentId,
    @NotBlank @Size(max = 120) String name,
    @NotNull DeploymentChannelType channelType,
    @NotBlank @Size(max = 80) String deploymentSlug,
    DeploymentStatus status,
    @Size(max = 500) String publicUrl,
    @Size(max = 120) String apiKey) {}
