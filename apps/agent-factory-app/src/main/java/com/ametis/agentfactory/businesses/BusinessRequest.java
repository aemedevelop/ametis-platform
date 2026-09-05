package com.ametis.agentfactory.businesses;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BusinessRequest(
    @NotBlank @Size(max = 120) String name,
    @Size(max = 500) String description,
    BusinessStatus status) {}
