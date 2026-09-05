package com.ametis.agentfactory.deployments;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record DeploymentRequest(
    @NotNull UUID agentId,
    @NotBlank @Size(max = 120) String name,
    @NotNull DeploymentChannelType channelType,
    @NotBlank @Size(max = 80) String deploymentSlug,
    DeploymentStatus status,
    @Size(max = 120) String apiKey,
    @Size(max = 500) String welcomeMessage,
    @Min(1) @Max(100000) Integer rateLimitPerMinute,
    @Min(1) @Max(1000000) Integer rateLimitPerDay,
    @Size(max = 20) List<@Size(max = 200) String> allowedOrigins) {}
