package com.ametis.newsletter.publications.api;

import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;

public record ScheduleRequest(@NotNull OffsetDateTime scheduledAt) {
}