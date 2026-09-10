package com.ametis.agentfactory.deployments;

import com.ametis.agentfactory.agents.AmetisAiQueryResponse;
import java.util.List;

public record PublicQueryResponse(
    String question,
    String answer,
    String responseType,
    List<String> suggestions) {

  static PublicQueryResponse from(AmetisAiQueryResponse response) {
    return new PublicQueryResponse(
        response.question(),
        response.answer(),
        response.responseType(),
        response.suggestions() == null ? List.of() : response.suggestions());
  }

  /** Variante con el texto y las sugerencias que aporta la plataforma (contenido del agente). */
  static PublicQueryResponse from(AmetisAiQueryResponse response, String answer, List<String> suggestions) {
    return new PublicQueryResponse(
        response.question(),
        answer,
        response.responseType(),
        suggestions == null ? List.of() : suggestions);
  }
}
