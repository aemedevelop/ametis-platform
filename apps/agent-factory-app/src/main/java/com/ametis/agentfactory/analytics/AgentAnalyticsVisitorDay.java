package com.ametis.agentfactory.analytics;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Un visitante activo en un día = una fila, sin importar cuántas preguntas
 * hizo. Ver {@link AgentAnalyticsVisitorDayRepository}; se escribe/lee vía
 * SQL nativo, esta clase es solo para que Hibernate valide el esquema.
 */
@Entity
@Table(name = "agent_analytics_visitor_days")
public class AgentAnalyticsVisitorDay {
  @Id
  private UUID id;

  private UUID tenantId;
  private UUID agentId;
  private String visitorId;
  private LocalDate day;

  protected AgentAnalyticsVisitorDay() {}
}
