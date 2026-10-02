package com.ametis.agentfactory.analytics;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AgentAnalyticsQuestionDailyRepository extends JpaRepository<AgentAnalyticsQuestionDaily, UUID> {

  @Modifying
  @Query(
      value = """
          insert into agent_factory.agent_analytics_question_daily
            (id, tenant_id, agent_id, day, question_key, question_sample, count, fallback_count)
          values (:id, :tenantId, :agentId, :day, :questionKey, :questionSample, 1, :fallbackIncrement)
          on conflict (tenant_id, agent_id, day, question_key) do update set
            count = agent_analytics_question_daily.count + 1,
            fallback_count = agent_analytics_question_daily.fallback_count + excluded.fallback_count
          """,
      nativeQuery = true)
  void increment(
      @Param("id") UUID id,
      @Param("tenantId") UUID tenantId,
      @Param("agentId") UUID agentId,
      @Param("day") LocalDate day,
      @Param("questionKey") String questionKey,
      @Param("questionSample") String questionSample,
      @Param("fallbackIncrement") int fallbackIncrement);

  interface TopQuestionRow {
    String getQuestionSample();
    Long getCount();
  }

  /**
   * Agrupa por {@code question_key} (normalizada) y suma entre días; usa la
   * última muestra de texto original vista para mostrarla (mismo texto salvo
   * mayúsculas/espacios, así que cualquiera sirve).
   */
  @Query(
      value = """
          select max(question_sample) as questionSample, sum(count) as count
          from agent_factory.agent_analytics_question_daily
          where tenant_id = :tenantId and agent_id = :agentId and day between :from and :to
          group by question_key
          order by sum(count) desc
          limit :limit
          """,
      nativeQuery = true)
  List<TopQuestionRow> topQuestions(@Param("tenantId") UUID tenantId, @Param("agentId") UUID agentId,
      @Param("from") LocalDate from, @Param("to") LocalDate to, @Param("limit") int limit);

  /**
   * Las preguntas puntuales que más veces el agente NO supo responder -- el
   * dato realmente accionable para cerrar huecos de conocimiento (más útil
   * que un porcentaje global de fallback).
   */
  @Query(
      value = """
          select max(question_sample) as questionSample, sum(fallback_count) as count
          from agent_factory.agent_analytics_question_daily
          where tenant_id = :tenantId and agent_id = :agentId and day between :from and :to
          group by question_key
          having sum(fallback_count) > 0
          order by sum(fallback_count) desc
          limit :limit
          """,
      nativeQuery = true)
  List<TopQuestionRow> topFallbackQuestions(@Param("tenantId") UUID tenantId, @Param("agentId") UUID agentId,
      @Param("from") LocalDate from, @Param("to") LocalDate to, @Param("limit") int limit);
}
