package com.ametis.agentfactory.analytics;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AgentAnalyticsHourlyRepository extends JpaRepository<AgentAnalyticsHourly, UUID> {

  /** Suma +1 (y +1 a fallback/sugerencia si aplica) en la fila despliegue+hora+día que corresponda. */
  @Modifying
  @Query(
      value = """
          insert into agent_factory.agent_analytics_hourly
            (id, tenant_id, agent_id, deployment_id, day, hour, total_questions, fallback_count, suggestion_used_count)
          values (:id, :tenantId, :agentId, :deploymentId, :day, :hour, 1, :fallbackIncrement, :suggestionIncrement)
          on conflict (tenant_id, agent_id, deployment_id, day, hour) do update set
            total_questions = agent_analytics_hourly.total_questions + 1,
            fallback_count = agent_analytics_hourly.fallback_count + excluded.fallback_count,
            suggestion_used_count = agent_analytics_hourly.suggestion_used_count + excluded.suggestion_used_count
          """,
      nativeQuery = true)
  void increment(
      @Param("id") UUID id,
      @Param("tenantId") UUID tenantId,
      @Param("agentId") UUID agentId,
      @Param("deploymentId") UUID deploymentId,
      @Param("day") LocalDate day,
      @Param("hour") int hour,
      @Param("fallbackIncrement") int fallbackIncrement,
      @Param("suggestionIncrement") int suggestionIncrement);

  interface Totals {
    Long getTotalQuestions();
    Long getFallbackCount();
    Long getSuggestionUsedCount();
  }

  /** A nivel agente: suma entre TODOS sus despliegues (no filtra deployment_id). */
  @Query(
      value = """
          select coalesce(sum(total_questions), 0) as totalQuestions,
                 coalesce(sum(fallback_count), 0) as fallbackCount,
                 coalesce(sum(suggestion_used_count), 0) as suggestionUsedCount
          from agent_factory.agent_analytics_hourly
          where tenant_id = :tenantId and agent_id = :agentId and day between :from and :to
          """,
      nativeQuery = true)
  Totals totals(@Param("tenantId") UUID tenantId, @Param("agentId") UUID agentId,
      @Param("from") LocalDate from, @Param("to") LocalDate to);

  interface DailyTotal {
    LocalDate getDay();
    Long getCount();
  }

  @Query(
      value = """
          select day as day, sum(total_questions) as count
          from agent_factory.agent_analytics_hourly
          where tenant_id = :tenantId and agent_id = :agentId and day between :from and :to
          group by day
          order by day
          """,
      nativeQuery = true)
  List<DailyTotal> totalsByDay(@Param("tenantId") UUID tenantId, @Param("agentId") UUID agentId,
      @Param("from") LocalDate from, @Param("to") LocalDate to);

  interface HourlyTotal {
    Integer getHour();
    Long getCount();
  }

  @Query(
      value = """
          select hour as hour, sum(total_questions) as count
          from agent_factory.agent_analytics_hourly
          where tenant_id = :tenantId and agent_id = :agentId and day between :from and :to
          group by hour
          order by hour
          """,
      nativeQuery = true)
  List<HourlyTotal> totalsByHour(@Param("tenantId") UUID tenantId, @Param("agentId") UUID agentId,
      @Param("from") LocalDate from, @Param("to") LocalDate to);

  interface DeploymentTotal {
    UUID getDeploymentId();
    Long getTotalQuestions();
    Long getFallbackCount();
  }

  /**
   * Comparativa por despliegue del mismo agente (categoría 5 del plan de
   * analíticas: distintos despliegues/canales de un mismo agente). Todavía no
   * se muestra en el dashboard -- el dato ya está capturado, se conecta
   * cuando se construya esa sección.
   */
  @Query(
      value = """
          select deployment_id as deploymentId,
                 sum(total_questions) as totalQuestions,
                 sum(fallback_count) as fallbackCount
          from agent_factory.agent_analytics_hourly
          where tenant_id = :tenantId and agent_id = :agentId and day between :from and :to
          group by deployment_id
          order by sum(total_questions) desc
          """,
      nativeQuery = true)
  List<DeploymentTotal> totalsByDeployment(@Param("tenantId") UUID tenantId, @Param("agentId") UUID agentId,
      @Param("from") LocalDate from, @Param("to") LocalDate to);
}
