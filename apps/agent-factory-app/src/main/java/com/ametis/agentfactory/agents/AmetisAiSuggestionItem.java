package com.ametis.agentfactory.agents;

/** Una pregunta sugerida y su tema, para indexar en el RAG. */
public record AmetisAiSuggestionItem(String topicId, String question) {}
