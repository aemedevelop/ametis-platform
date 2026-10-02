package com.ametis.agentfactory.analytics;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public record AgentAnalyticsResponse(
    OffsetDateTime from,
    OffsetDateTime to,
    long totalQuestions,
    long uniqueVisitors,
    long returningVisitors,
    long fallbackCount,
    double fallbackRate,
    long suggestionUsedCount,
    List<DailyPoint> byDay,
    List<HourlyPoint> byHour,
    List<TopQuestion> topQuestions,
    List<TopQuestion> topFallbackQuestions) {

  public record DailyPoint(LocalDate date, long count) {}

  /** Hora local del servidor, 0-23. */
  public record HourlyPoint(int hour, long count) {}

  public record TopQuestion(String question, long count) {}
}
