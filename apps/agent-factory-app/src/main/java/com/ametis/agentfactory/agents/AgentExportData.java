package com.ametis.agentfactory.agents;

import java.util.List;
import java.util.Map;

/**
 * Configuración exportable de un agente (sin IDs ni vínculos específicos del
 * tenant de origen). {@code knowledgeBaseNames} es solo informativo -- las
 * bases de conocimiento no viajan, hay que recrearlas/vincularlas a mano en
 * el entorno de destino porque sus documentos indexados viven en el storage
 * propio de cada tenant.
 */
public record AgentExportData(
    String name,
    String description,
    String persona,
    String targetAudience,
    String tone,
    String responseLanguage,
    String instructions,
    List<String> suggestedQuestions,
    Map<String, String> assistantTexts,
    int suggestedQuestionsCount,
    String suggestedQuestionsOrder,
    List<QuestionTopic> questionTopics,
    List<String> knowledgeBaseNames) {}
