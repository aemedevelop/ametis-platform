package com.ametis.agentfactory.analytics;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Fila de resumen (tenant+agente+día+hora): cuántas preguntas, cuántas
 * "fallback" y cuántas por sugerencia hubo esa hora. Se actualiza vía upsert
 * en {@link AgentAnalyticsHourlyRepository#increment} -- nunca con `save()`
 * directo, así que esta clase solo existe para que Hibernate valide el
 * esquema; el contenido real lo maneja SQL nativo.
 */
@Entity
@Table(name = "agent_analytics_hourly")
public class AgentAnalyticsHourly {
  @Id
  private UUID id;

  private UUID tenantId;
  private UUID agentId;
  private UUID deploymentId;
  private LocalDate day;
  private short hour;
  private long totalQuestions;
  private long fallbackCount;
  private long suggestionUsedCount;

  protected AgentAnalyticsHourly() {}
}
