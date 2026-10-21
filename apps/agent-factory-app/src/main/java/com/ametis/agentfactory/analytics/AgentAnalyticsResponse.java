package com.ametis.agentfactory.analytics;

import com.ametis.agentfactory.deployments.DeploymentChannelType;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record AgentAnalyticsResponse(
    OffsetDateTime from,
    OffsetDateTime to,
    long totalQuestions,
    long uniqueVisitors,
    long returningVisitors,
    long fallbackCount,
    double fallbackRate,
    long suggestionUsedCount,
    LocalDate previousFrom,
    LocalDate previousTo,
    PeriodSummary previous,
    List<DailyPoint> byDay,
    List<HourlyPoint> byHour,
    List<DeploymentPoint> byDeployment,
    List<TopicPoint> byTopic,
    List<TopQuestion> topQuestions,
    List<TopQuestion> topFallbackQuestions) {

  /** KPIs de un periodo; se usa para el periodo anterior (mismos N días justo antes del rango). */
  public record PeriodSummary(
      long totalQuestions,
      long uniqueVisitors,
      long returningVisitors,
      long fallbackCount,
      double fallbackRate,
      long suggestionUsedCount) {}

  /** {@code name}/{@code channelType} son null si el despliegue ya no existe. */
  public record DeploymentPoint(
      UUID deploymentId,
      String name,
      DeploymentChannelType channelType,
      long totalQuestions,
      long fallbackCount,
      double fallbackRate) {}

  /**
   * {@code topicId} vacío = la pregunta no casó con ningún tema.
   * {@code label} es null en ese caso y también si el tema ya no existe en
   * el agente.
   */
  public record TopicPoint(String topicId, String label, long count) {}

  public record DailyPoint(LocalDate date, long count) {}

  /** Hora local del servidor, 0-23. */
  public record HourlyPoint(int hour, long count) {}

  public record TopQuestion(String question, long count) {}
}
