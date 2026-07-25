package com.ametis.coreapi.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.UUID;

public record CreateMembershipRequest(
    @NotNull UUID userId,
    @NotBlank @Pattern(regexp = "OWNER|ADMIN|MEMBER|VIEWER") String roleCode) {
}
