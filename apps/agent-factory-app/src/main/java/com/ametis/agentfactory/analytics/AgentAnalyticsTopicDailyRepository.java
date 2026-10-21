package com.ametis.agentfactory.analytics;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AgentAnalyticsTopicDailyRepository extends JpaRepository<AgentAnalyticsTopicDaily, UUID> {

  /** {@code topicId} vacío = la pregunta no casó con ningún tema. */
  @Modifying
  @Query(
      value = """
          insert into agent_factory.agent_analytics_topic_daily
            (id, tenant_id, agent_id, day, topic_id, count)
          values (:id, :tenantId, :agentId, :day, :topicId, 1)
          on conflict (tenant_id, agent_id, day, topic_id) do update set
            count = agent_analytics_topic_daily.count + 1
          """,
      nativeQuery = true)
  void increment(
      @Param("id") UUID id,
      @Param("tenantId") UUID tenantId,
      @Param("agentId") UUID agentId,
      @Param("day") LocalDate day,
      @Param("topicId") String topicId);

  interface TopicTotal {
    String getTopicId();
    Long getCount();
  }

  @Query(
      value = """
          select topic_id as topicId, sum(count) as count
          from agent_factory.agent_analytics_topic_daily
          where tenant_id = :tenantId and agent_id = :agentId and day between :from and :to
          group by topic_id
          order by sum(count) desc
          """,
      nativeQuery = true)
  List<TopicTotal> totalsByTopic(@Param("tenantId") UUID tenantId, @Param("agentId") UUID agentId,
      @Param("from") LocalDate from, @Param("to") LocalDate to);
}
