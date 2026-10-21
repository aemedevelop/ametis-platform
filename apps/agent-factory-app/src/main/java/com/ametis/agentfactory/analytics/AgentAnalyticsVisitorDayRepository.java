package com.ametis.agentfactory.analytics;

import java.time.LocalDate;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AgentAnalyticsVisitorDayRepository extends JpaRepository<AgentAnalyticsVisitorDay, UUID> {

  /** Idempotente: si ese visitante ya tiene fila para ese día, no hace nada. */
  @Modifying
  @Query(
      value = """
          insert into agent_factory.agent_analytics_visitor_days (id, tenant_id, agent_id, visitor_id, day)
          values (:id, :tenantId, :agentId, :visitorId, :day)
          on conflict (tenant_id, agent_id, visitor_id, day) do nothing
          """,
      nativeQuery = true)
  void recordVisit(
      @Param("id") UUID id,
      @Param("tenantId") UUID tenantId,
      @Param("agentId") UUID agentId,
      @Param("visitorId") String visitorId,
      @Param("day") LocalDate day);

  @Query(
      value = """
          select count(distinct visitor_id) from agent_factory.agent_analytics_visitor_days
          where tenant_id = :tenantId and agent_id = :agentId and day between :from and :to
          """,
      nativeQuery = true)
  long countUniqueVisitors(@Param("tenantId") UUID tenantId, @Param("agentId") UUID agentId,
      @Param("from") LocalDate from, @Param("to") LocalDate to);

  /** Visitante con más de un día distinto de actividad dentro del rango. */
  @Query(
      value = """
          select count(*) from (
            select visitor_id from agent_factory.agent_analytics_visitor_days
            where tenant_id = :tenantId and agent_id = :agentId and day between :from and :to
            group by visitor_id having count(*) > 1
          ) recurring
          """,
      nativeQuery = true)
  long countReturningVisitors(@Param("tenantId") UUID tenantId, @Param("agentId") UUID agentId,
      @Param("from") LocalDate from, @Param("to") LocalDate to);
}
