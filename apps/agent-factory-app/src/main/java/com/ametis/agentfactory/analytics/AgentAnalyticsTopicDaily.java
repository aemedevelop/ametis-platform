package com.ametis.agentfactory.analytics;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Preguntas de un día que casaron con un tema de preguntas sugeridas
 * ({@code topicId} vacío = ninguno). Ver
 * {@link AgentAnalyticsTopicDailyRepository}; se escribe/lee vía SQL nativo,
 * esta clase es solo para que Hibernate valide el esquema.
 */
@Entity
@Table(name = "agent_analytics_topic_daily")
public class AgentAnalyticsTopicDaily {
  @Id
  private UUID id;

  private UUID tenantId;
  private UUID agentId;
  private LocalDate day;
  private String topicId;
  private long count;

  protected AgentAnalyticsTopicDaily() {}
}
