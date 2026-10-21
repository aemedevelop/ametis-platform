package com.ametis.agentfactory.analytics;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Frecuencia de una pregunta (normalizada) en un día. Ver
 * {@link AgentAnalyticsQuestionDailyRepository}; se escribe/lee vía SQL
 * nativo, esta clase es solo para que Hibernate valide el esquema.
 */
@Entity
@Table(name = "agent_analytics_question_daily")
public class AgentAnalyticsQuestionDaily {
  @Id
  private UUID id;

  private UUID tenantId;
  private UUID agentId;
  private LocalDate day;
  private String questionKey;
  private String questionSample;
  private long count;

  protected AgentAnalyticsQuestionDaily() {}
}
