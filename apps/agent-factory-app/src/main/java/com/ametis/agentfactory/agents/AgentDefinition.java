package com.ametis.agentfactory.agents;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "agents")
public class AgentDefinition {
  @Id
  private UUID id;

  @Column(nullable = false)
  private UUID tenantId;

  @Column(nullable = false, updatable = false)
  private UUID businessId;

  @Column(nullable = false, length = 80)
  private String name;

  @Column(length = 500)
  private String description;

  @Column(length = 900)
  private String instructions;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "suggested_questions", nullable = false)
  private List<String> suggestedQuestions = new ArrayList<>();

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "assistant_texts", nullable = false)
  private Map<String, String> assistantTexts = new LinkedHashMap<>();

  @Column(name = "suggested_questions_count", nullable = false)
  private int suggestedQuestionsCount = 3;

  @Column(name = "suggested_questions_order", nullable = false, length = 10)
  private String suggestedQuestionsOrder = "random";

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "question_topics", nullable = false)
  private List<QuestionTopic> questionTopics = new ArrayList<>();

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private AgentStatus status;

  private UUID createdBy;

  @Column(nullable = false)
  private OffsetDateTime createdAt;

  @Column(nullable = false)
  private OffsetDateTime updatedAt;

  private OffsetDateTime publishedAt;

  protected AgentDefinition() {}

  public static AgentDefinition create(
      UUID tenantId,
      UUID businessId,
      String name,
      String description,
      String instructions,
      UUID createdBy) {
    AgentDefinition agent = new AgentDefinition();
    agent.id = UUID.randomUUID();
    agent.tenantId = tenantId;
    agent.businessId = businessId;
    agent.name = name;
    agent.description = description;
    agent.instructions = instructions;
    agent.status = AgentStatus.DRAFT;
    agent.createdBy = createdBy;
    agent.createdAt = OffsetDateTime.now();
    agent.updatedAt = agent.createdAt;
    return agent;
  }

  public void update(
      String name,
      String description,
      String instructions) {
    this.name = name;
    this.description = description;
    this.instructions = instructions;
    status = AgentStatus.DRAFT;
    publishedAt = null;
    updatedAt = OffsetDateTime.now();
  }

  /** Contenido de presentación del asistente. No afecta al estado de publicación. */
  public void applyWidgetContent(
      List<String> suggestedQuestions,
      Map<String, String> assistantTexts,
      int suggestedQuestionsCount,
      String suggestedQuestionsOrder,
      List<QuestionTopic> questionTopics) {
    this.suggestedQuestions = suggestedQuestions == null ? new ArrayList<>() : new ArrayList<>(suggestedQuestions);
    this.assistantTexts = assistantTexts == null ? new LinkedHashMap<>() : new LinkedHashMap<>(assistantTexts);
    this.questionTopics = questionTopics == null ? new ArrayList<>() : new ArrayList<>(questionTopics);
    int maxCount = Math.max(1, this.suggestedQuestions.size());
    this.suggestedQuestionsCount = Math.min(Math.max(suggestedQuestionsCount, 1), maxCount);
    this.suggestedQuestionsOrder = "fixed".equals(suggestedQuestionsOrder) ? "fixed" : "random";
    updatedAt = OffsetDateTime.now();
  }

  public void publish() {
    status = AgentStatus.READY;
    publishedAt = OffsetDateTime.now();
    updatedAt = publishedAt;
  }

  public UUID getId() { return id; }
  public UUID getTenantId() { return tenantId; }
  public UUID getBusinessId() { return businessId; }
  public String getName() { return name; }
  public String getDescription() { return description; }
  public String getInstructions() { return instructions; }
  public List<String> getSuggestedQuestions() {
    return suggestedQuestions == null ? List.of() : List.copyOf(suggestedQuestions);
  }
  public Map<String, String> getAssistantTexts() {
    return assistantTexts == null ? Map.of() : Map.copyOf(assistantTexts);
  }
  public int getSuggestedQuestionsCount() { return suggestedQuestionsCount; }
  public String getSuggestedQuestionsOrder() { return suggestedQuestionsOrder; }
  public List<QuestionTopic> getQuestionTopics() {
    return questionTopics == null ? List.of() : List.copyOf(questionTopics);
  }
  public AgentStatus getStatus() { return status; }
  public UUID getCreatedBy() { return createdBy; }
  public OffsetDateTime getCreatedAt() { return createdAt; }
  public OffsetDateTime getUpdatedAt() { return updatedAt; }
  public OffsetDateTime getPublishedAt() { return publishedAt; }
}
