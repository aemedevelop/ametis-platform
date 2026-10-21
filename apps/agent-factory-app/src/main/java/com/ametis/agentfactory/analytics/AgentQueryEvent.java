package com.ametis.agentfactory.analytics;

import com.ametis.agentfactory.deployments.DeploymentChannelType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Una pregunta que pasó por el consumo público de un despliegue (hoy solo
 * WEB_CHAT, mañana cualquier canal). Es la base de datos cruda del módulo de
 * analíticas -- las agregaciones (por día, tema, tasa de fallback, etc.) se
 * calculan en {@link AgentAnalyticsService} a partir de estos eventos, no acá.
 *
 * <p>Funciona igual para visitantes anónimos que para autenticados:
 * {@code visitorId} lo genera el propio widget (localStorage del visitante,
 * sin pedir login) y {@code userId} queda para cuando exista un canal con
 * sesión real -- ambos son opcionales, nunca uno bloquea al otro.
 */
@Entity
@Table(name = "agent_query_events")
public class AgentQueryEvent {
  @Id
  private UUID id;

  @Column(nullable = false)
  private UUID tenantId;

  @Column(nullable = false)
  private UUID agentId;

  @Column(nullable = false)
  private UUID deploymentId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private DeploymentChannelType channelType;

  @Column(length = 80)
  private String visitorId;

  private UUID userId;

  @Column(nullable = false, length = 500)
  private String question;

  @Column(length = 32)
  private String responseType;

  @Column(length = 80)
  private String matchedTopicId;

  @Column(nullable = false)
  private boolean usedSuggestion;

  @Column(nullable = false)
  private OffsetDateTime createdAt;

  protected AgentQueryEvent() {}

  public static AgentQueryEvent record(
      UUID tenantId,
      UUID agentId,
      UUID deploymentId,
      DeploymentChannelType channelType,
      String visitorId,
      UUID userId,
      String question,
      String responseType,
      String matchedTopicId,
      boolean usedSuggestion) {
    AgentQueryEvent event = new AgentQueryEvent();
    event.id = UUID.randomUUID();
    event.tenantId = tenantId;
    event.agentId = agentId;
    event.deploymentId = deploymentId;
    event.channelType = channelType;
    event.visitorId = trim(visitorId, 80);
    event.userId = userId;
    event.question = trim(question, 500);
    event.responseType = trim(responseType, 32);
    event.matchedTopicId = trim(matchedTopicId, 80);
    event.usedSuggestion = usedSuggestion;
    event.createdAt = OffsetDateTime.now();
    return event;
  }

  private static String trim(String value, int maxLength) {
    if (value == null) {
      return null;
    }
    String cleaned = value.trim();
    if (cleaned.isEmpty()) {
      return null;
    }
    return cleaned.length() > maxLength ? cleaned.substring(0, maxLength) : cleaned;
  }

  public UUID getId() { return id; }
  public UUID getTenantId() { return tenantId; }
  public UUID getAgentId() { return agentId; }
  public UUID getDeploymentId() { return deploymentId; }
  public DeploymentChannelType getChannelType() { return channelType; }
  public String getVisitorId() { return visitorId; }
  public UUID getUserId() { return userId; }
  public String getQuestion() { return question; }
  public String getResponseType() { return responseType; }
  public String getMatchedTopicId() { return matchedTopicId; }
  public boolean isUsedSuggestion() { return usedSuggestion; }
  public OffsetDateTime getCreatedAt() { return createdAt; }
}
