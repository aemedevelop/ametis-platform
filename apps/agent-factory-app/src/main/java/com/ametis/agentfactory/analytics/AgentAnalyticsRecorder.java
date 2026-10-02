package com.ametis.agentfactory.analytics;

import com.ametis.agentfactory.deployments.DeploymentChannelType;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Punto único de escritura del módulo de analíticas: guarda el evento crudo
 * (auditoría/debug) y, en la misma operación, suma +1 en las tres tablas de
 * resumen que sí lee el dashboard (ver {@link AgentAnalyticsService}). Así el
 * resumen siempre está al día sin necesidad de un job aparte que recalcule.
 */
@Service
public class AgentAnalyticsRecorder {
  private final AgentQueryEventRepository eventRepository;
  private final AgentAnalyticsHourlyRepository hourlyRepository;
  private final AgentAnalyticsVisitorDayRepository visitorDayRepository;
  private final AgentAnalyticsQuestionDailyRepository questionDailyRepository;

  public AgentAnalyticsRecorder(
      AgentQueryEventRepository eventRepository,
      AgentAnalyticsHourlyRepository hourlyRepository,
      AgentAnalyticsVisitorDayRepository visitorDayRepository,
      AgentAnalyticsQuestionDailyRepository questionDailyRepository) {
    this.eventRepository = eventRepository;
    this.hourlyRepository = hourlyRepository;
    this.visitorDayRepository = visitorDayRepository;
    this.questionDailyRepository = questionDailyRepository;
  }

  @Transactional
  public void record(
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
    eventRepository.save(AgentQueryEvent.record(
        tenantId, agentId, deploymentId, channelType, visitorId, userId,
        question, responseType, matchedTopicId, usedSuggestion));

    OffsetDateTime now = OffsetDateTime.now();
    LocalDate day = now.toLocalDate();
    int fallbackIncrement = "fallback".equals(responseType) ? 1 : 0;
    int suggestionIncrement = usedSuggestion ? 1 : 0;
    hourlyRepository.increment(
        UUID.randomUUID(), tenantId, agentId, deploymentId, day, now.getHour(), fallbackIncrement, suggestionIncrement);

    if (visitorId != null && !visitorId.isBlank()) {
      visitorDayRepository.recordVisit(UUID.randomUUID(), tenantId, agentId, visitorId.trim(), day);
    }

    String sample = question == null ? "" : question.trim();
    if (!sample.isEmpty()) {
      if (sample.length() > 500) {
        sample = sample.substring(0, 500);
      }
      String key = sample.toLowerCase(Locale.ROOT);
      questionDailyRepository.increment(UUID.randomUUID(), tenantId, agentId, day, key, sample, fallbackIncrement);
    }
  }
}
