package com.ametis.agentfactory.businesses;

import jakarta.validation.constraints.NotBlank;

public record BusinessDeleteRequest(@NotBlank String confirmationName) {}
