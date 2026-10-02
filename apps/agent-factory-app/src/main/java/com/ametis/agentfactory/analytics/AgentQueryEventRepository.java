package com.ametis.agentfactory.analytics;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentQueryEventRepository extends JpaRepository<AgentQueryEvent, UUID> {
  /**
   * Trae el detalle crudo del rango -- las agregaciones (por día, por hora,
   * top preguntas, tasa de fallback, visitantes únicos/recurrentes) se
   * calculan en Java sobre esta lista (ver {@link AgentAnalyticsService}) en
   * vez de escribir una consulta agregada distinta por cada métrica. Para el
   * volumen de un dashboard (semanas/meses de un agente) es más simple de
   * mantener y sigue siendo barato; si algún día el volumen lo justifica, se
   * puede mover a consultas agregadas en base de datos sin cambiar la API.
   */
  List<AgentQueryEvent> findAllByTenantIdAndAgentIdAndCreatedAtBetweenOrderByCreatedAtAsc(
      UUID tenantId, UUID agentId, OffsetDateTime from, OffsetDateTime to);
}
