package com.ametis.agentfactory.agents;

import java.util.List;

/**
 * Tema de preguntas sugeridas del asistente. {@code id} es un slug estable;
 * {@code questions} se indexan en el RAG para casar la pregunta del visitante
 * con su tema.
 */
public record QuestionTopic(String id, String label, List<String> questions) {}
