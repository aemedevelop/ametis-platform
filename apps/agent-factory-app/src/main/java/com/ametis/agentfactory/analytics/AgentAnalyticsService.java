package com.ametis.agentfactory.analytics;

import com.ametis.agentfactory.agents.AgentDefinition;
import com.ametis.agentfactory.agents.AgentKnowledgeBase;
import com.ametis.agentfactory.agents.AgentKnowledgeBaseRepository;
import com.ametis.agentfactory.agents.AgentRepository;
import com.ametis.agentfactory.agents.QuestionTopic;
import com.ametis.agentfactory.businesses.Business;
import com.ametis.agentfactory.businesses.BusinessRepository;
import com.ametis.agentfactory.deployments.AgentDeployment;
import com.ametis.agentfactory.deployments.AgentDeploymentRepository;
import com.ametis.agentfactory.knowledge.KnowledgeBase;
import com.ametis.agentfactory.knowledge.KnowledgeBaseRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
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
  private final BusinessRepository businessRepository;
  private final AgentKnowledgeBaseRepository agentKnowledgeBaseRepository;
  private final KnowledgeBaseRepository knowledgeBaseRepository;
  private final AgentDeploymentRepository deploymentRepository;
  private final AgentAnalyticsHourlyRepository hourlyRepository;
  private final AgentAnalyticsVisitorDayRepository visitorDayRepository;
  private final AgentAnalyticsQuestionDailyRepository questionDailyRepository;
  private final AgentAnalyticsTopicDailyRepository topicDailyRepository;

  public AgentAnalyticsService(
      AgentRepository agentRepository,
      BusinessRepository businessRepository,
      AgentKnowledgeBaseRepository agentKnowledgeBaseRepository,
      KnowledgeBaseRepository knowledgeBaseRepository,
      AgentDeploymentRepository deploymentRepository,
      AgentAnalyticsHourlyRepository hourlyRepository,
      AgentAnalyticsVisitorDayRepository visitorDayRepository,
      AgentAnalyticsQuestionDailyRepository questionDailyRepository,
      AgentAnalyticsTopicDailyRepository topicDailyRepository) {
    this.agentRepository = agentRepository;
    this.businessRepository = businessRepository;
    this.agentKnowledgeBaseRepository = agentKnowledgeBaseRepository;
    this.knowledgeBaseRepository = knowledgeBaseRepository;
    this.deploymentRepository = deploymentRepository;
    this.hourlyRepository = hourlyRepository;
    this.visitorDayRepository = visitorDayRepository;
    this.questionDailyRepository = questionDailyRepository;
    this.topicDailyRepository = topicDailyRepository;
  }

  /**
   * Agentes de todos los negocios del workspace, agrupados por negocio (orden
   * alfabético) y, dentro de cada uno, del más reciente al más antiguo. Las
   * analíticas no dependen del negocio activo, igual que el listado de
   * despliegues.
   */
  public List<AnalyticsAgentResponse> listAgents(UUID tenantId) {
    List<AgentDefinition> agents = agentRepository.findAllByTenantIdOrderByUpdatedAtDesc(tenantId);
    if (agents.isEmpty()) {
      return List.of();
    }
    List<Business> businesses = businessRepository.findAllByTenantIdOrderByNameAsc(tenantId);
    Map<UUID, String> businessNames = businesses.stream()
        .collect(Collectors.toMap(Business::getId, Business::getName));
    List<UUID> businessOrder = businesses.stream().map(Business::getId).toList();

    List<UUID> agentIds = agents.stream().map(AgentDefinition::getId).toList();
    List<AgentKnowledgeBase> links = agentKnowledgeBaseRepository.findAllByTenantIdAndAgentIdIn(tenantId, agentIds);
    List<UUID> baseIds = links.stream().map(AgentKnowledgeBase::getKnowledgeBaseId).distinct().toList();
    Map<UUID, String> baseNames = baseIds.isEmpty()
        ? Map.of()
        : knowledgeBaseRepository.findAllByTenantIdAndIdIn(tenantId, baseIds).stream()
            .collect(Collectors.toMap(KnowledgeBase::getId, KnowledgeBase::getName));
    Map<UUID, List<String>> namesByAgent = links.stream()
        .collect(Collectors.groupingBy(
            AgentKnowledgeBase::getAgentId,
            Collectors.mapping(link -> baseNames.get(link.getKnowledgeBaseId()), Collectors.filtering(name -> name != null, Collectors.toList()))));
    Map<UUID, Long> baseCountByAgent = links.stream()
        .collect(Collectors.groupingBy(AgentKnowledgeBase::getAgentId, Collectors.counting()));

    // sorted() es estable: conserva el orden por fecha dentro de cada negocio.
    return agents.stream()
        .sorted((left, right) -> Integer.compare(
            businessOrder.indexOf(left.getBusinessId()), businessOrder.indexOf(right.getBusinessId())))
        .map(agent -> new AnalyticsAgentResponse(
            agent.getId(),
            agent.getBusinessId(),
            businessNames.get(agent.getBusinessId()),
            agent.getName(),
            agent.getDescription(),
            agent.getStatus(),
            agent.getUpdatedAt(),
            baseCountByAgent.getOrDefault(agent.getId(), 0L).intValue(),
            namesByAgent.getOrDefault(agent.getId(), List.of())))
        .toList();
  }

  public AgentAnalyticsResponse overview(UUID tenantId, UUID agentId, OffsetDateTime from, OffsetDateTime to) {
    AgentDefinition agent = agentRepository.findByIdAndTenantId(agentId, tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.agentNotFound"));
    if (!from.isBefore(to)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "error.analyticsRangeInvalid");
    }

    // Los rollups son por día -- se pierde precisión de sub-día en los bordes
    // del rango (ver comentario en el servicio), aceptable para un dashboard
    // que se navega por presets de días (7/30/90), no por rangos exactos.
    LocalDate fromDay = from.toLocalDate();
    LocalDate toDay = to.toLocalDate();

    AgentAnalyticsResponse.PeriodSummary current = summarize(tenantId, agent.getId(), fromDay, toDay);

    // Periodo anterior: los mismos N días inmediatamente antes del rango
    // pedido, para poder decir "+40 % frente al periodo anterior".
    long rangeDays = ChronoUnit.DAYS.between(fromDay, toDay) + 1;
    LocalDate previousTo = fromDay.minusDays(1);
    LocalDate previousFrom = previousTo.minusDays(rangeDays - 1);
    AgentAnalyticsResponse.PeriodSummary previous = summarize(tenantId, agent.getId(), previousFrom, previousTo);

    List<AgentAnalyticsHourlyRepository.DeploymentTotal> deploymentTotals =
        hourlyRepository.totalsByDeployment(tenantId, agent.getId(), fromDay, toDay);
    // Por id y no por agente: el despliegue de prueba del workspace se
    // reapunta entre agentes y aun así debe conservar su nombre aquí.
    Map<UUID, AgentDeployment> deploymentsById = deploymentRepository
        .findAllById(deploymentTotals.stream().map(AgentAnalyticsHourlyRepository.DeploymentTotal::getDeploymentId).toList())
        .stream()
        .filter(deployment -> deployment.getTenantId().equals(tenantId))
        .collect(Collectors.toMap(AgentDeployment::getId, Function.identity()));
    List<AgentAnalyticsResponse.DeploymentPoint> byDeployment = deploymentTotals
        .stream()
        .map(row -> {
          // null si el despliegue ya se borró: sus preguntas siguen
          // contando, solo se pierde el nombre.
          AgentDeployment deployment = deploymentsById.get(row.getDeploymentId());
          long questions = row.getTotalQuestions() == null ? 0 : row.getTotalQuestions();
          long fallbacks = row.getFallbackCount() == null ? 0 : row.getFallbackCount();
          return new AgentAnalyticsResponse.DeploymentPoint(
              row.getDeploymentId(),
              deployment == null ? null : deployment.getName(),
              deployment == null ? null : deployment.getChannelType(),
              questions,
              fallbacks,
              questions == 0 ? 0 : (double) fallbacks / questions);
        })
        .toList();

    List<AgentAnalyticsResponse.DailyPoint> byDay = hourlyRepository.totalsByDay(tenantId, agent.getId(), fromDay, toDay)
        .stream()
        .map(row -> new AgentAnalyticsResponse.DailyPoint(row.getDay(), row.getCount() == null ? 0 : row.getCount()))
        .toList();

    List<AgentAnalyticsResponse.HourlyPoint> byHour = hourlyRepository.totalsByHour(tenantId, agent.getId(), fromDay, toDay)
        .stream()
        .map(row -> new AgentAnalyticsResponse.HourlyPoint(row.getHour(), row.getCount() == null ? 0 : row.getCount()))
        .toList();

    // La etiqueta sale de los temas actuales del agente; si el tema ya se
    // borró (o la pregunta no casó con ninguno) va en null y el frontend
    // decide el texto.
    Map<String, String> topicLabels = agent.getQuestionTopics().stream()
        .filter(topic -> topic.id() != null && topic.label() != null)
        .collect(Collectors.toMap(QuestionTopic::id, QuestionTopic::label, (first, second) -> first));
    List<AgentAnalyticsResponse.TopicPoint> byTopic = topicDailyRepository
        .totalsByTopic(tenantId, agent.getId(), fromDay, toDay)
        .stream()
        .map(row -> new AgentAnalyticsResponse.TopicPoint(
            row.getTopicId(), topicLabels.get(row.getTopicId()), row.getCount() == null ? 0 : row.getCount()))
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
        from, to, current.totalQuestions(), current.uniqueVisitors(), current.returningVisitors(),
        current.fallbackCount(), current.fallbackRate(), current.suggestionUsedCount(),
        previousFrom, previousTo, previous,
        byDay, byHour, byDeployment, byTopic, topQuestions, topFallbackQuestions);
  }

  private AgentAnalyticsResponse.PeriodSummary summarize(UUID tenantId, UUID agentId, LocalDate fromDay, LocalDate toDay) {
    AgentAnalyticsHourlyRepository.Totals totals = hourlyRepository.totals(tenantId, agentId, fromDay, toDay);
    long totalQuestions = totals.getTotalQuestions() == null ? 0 : totals.getTotalQuestions();
    long fallbackCount = totals.getFallbackCount() == null ? 0 : totals.getFallbackCount();
    long suggestionUsedCount = totals.getSuggestionUsedCount() == null ? 0 : totals.getSuggestionUsedCount();
    return new AgentAnalyticsResponse.PeriodSummary(
        totalQuestions,
        visitorDayRepository.countUniqueVisitors(tenantId, agentId, fromDay, toDay),
        visitorDayRepository.countReturningVisitors(tenantId, agentId, fromDay, toDay),
        fallbackCount,
        totalQuestions == 0 ? 0 : (double) fallbackCount / totalQuestions,
        suggestionUsedCount);
  }
}
