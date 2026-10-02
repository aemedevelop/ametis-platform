package com.ametis.agentfactory.analytics;

import com.ametis.agentfactory.agents.AgentDefinition;
import com.ametis.agentfactory.agents.AgentRepository;
import com.ametis.agentfactory.businesses.Business;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Lee el dashboard de analíticas de las tablas de resumen (rollups), nunca de
 * la tabla cruda de eventos -- ver el comentario en la migración
 * V25__agent_analytics_rollups.sql sobre por qué. El tamaño de estas
 * consultas depende de días × horas del rango, no del volumen histórico de
 * preguntas.
 */
@Service
public class AgentAnalyticsService {
  private static final int TOP_QUESTIONS_LIMIT = 10;

  private final AgentRepository agentRepository;
  private final AgentAnalyticsHourlyRepository hourlyRepository;
  private final AgentAnalyticsVisitorDayRepository visitorDayRepository;
  private final AgentAnalyticsQuestionDailyRepository questionDailyRepository;

  public AgentAnalyticsService(
      AgentRepository agentRepository,
      AgentAnalyticsHourlyRepository hourlyRepository,
      AgentAnalyticsVisitorDayRepository visitorDayRepository,
      AgentAnalyticsQuestionDailyRepository questionDailyRepository) {
    this.agentRepository = agentRepository;
    this.hourlyRepository = hourlyRepository;
    this.visitorDayRepository = visitorDayRepository;
    this.questionDailyRepository = questionDailyRepository;
  }

  public AgentAnalyticsResponse overview(Business business, UUID agentId, OffsetDateTime from, OffsetDateTime to) {
    UUID tenantId = business.getTenantId();
    AgentDefinition agent = agentRepository.findByIdAndBusinessId(agentId, business.getId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.agentNotFound"));
    if (!from.isBefore(to)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "error.analyticsRangeInvalid");
    }

    // Los rollups son por día -- se pierde precisión de sub-día en los bordes
    // del rango (ver comentario en el servicio), aceptable para un dashboard
    // que se navega por presets de días (7/30/90), no por rangos exactos.
    LocalDate fromDay = from.toLocalDate();
    LocalDate toDay = to.toLocalDate();

    AgentAnalyticsHourlyRepository.Totals totals = hourlyRepository.totals(tenantId, agent.getId(), fromDay, toDay);
    long totalQuestions = totals.getTotalQuestions() == null ? 0 : totals.getTotalQuestions();
    long fallbackCount = totals.getFallbackCount() == null ? 0 : totals.getFallbackCount();
    long suggestionUsedCount = totals.getSuggestionUsedCount() == null ? 0 : totals.getSuggestionUsedCount();
    double fallbackRate = totalQuestions == 0 ? 0 : (double) fallbackCount / totalQuestions;

    long uniqueVisitors = visitorDayRepository.countUniqueVisitors(tenantId, agent.getId(), fromDay, toDay);
    long returningVisitors = visitorDayRepository.countReturningVisitors(tenantId, agent.getId(), fromDay, toDay);

    List<AgentAnalyticsResponse.DailyPoint> byDay = hourlyRepository.totalsByDay(tenantId, agent.getId(), fromDay, toDay)
        .stream()
        .map(row -> new AgentAnalyticsResponse.DailyPoint(row.getDay(), row.getCount() == null ? 0 : row.getCount()))
        .toList();

    List<AgentAnalyticsResponse.HourlyPoint> byHour = hourlyRepository.totalsByHour(tenantId, agent.getId(), fromDay, toDay)
        .stream()
        .map(row -> new AgentAnalyticsResponse.HourlyPoint(row.getHour(), row.getCount() == null ? 0 : row.getCount()))
        .toList();

    List<AgentAnalyticsResponse.TopQuestion> topQuestions = questionDailyRepository
        .topQuestions(tenantId, agent.getId(), fromDay, toDay, TOP_QUESTIONS_LIMIT)
        .stream()
        .map(row -> new AgentAnalyticsResponse.TopQuestion(row.getQuestionSample(), row.getCount() == null ? 0 : row.getCount()))
        .toList();

    List<AgentAnalyticsResponse.TopQuestion> topFallbackQuestions = questionDailyRepository
        .topFallbackQuestions(tenantId, agent.getId(), fromDay, toDay, TOP_QUESTIONS_LIMIT)
        .stream()
        .map(row -> new AgentAnalyticsResponse.TopQuestion(row.getQuestionSample(), row.getCount() == null ? 0 : row.getCount()))
        .toList();

    return new AgentAnalyticsResponse(
        from, to, totalQuestions, uniqueVisitors, returningVisitors,
        fallbackCount, fallbackRate, suggestionUsedCount,
        byDay, byHour, topQuestions, topFallbackQuestions);
  }
}
