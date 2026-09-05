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
        response.suggestions());
  }
}
