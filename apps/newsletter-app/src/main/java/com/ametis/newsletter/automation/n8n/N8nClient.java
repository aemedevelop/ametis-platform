package com.ametis.newsletter.automation.n8n;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class N8nClient {
  private final RestClient restClient;
  private final String generatePath;
  private final String agentGeneratePath;

  public N8nClient(
      @Value("${newsletter.n8n.base-url}") String baseUrl,
      @Value("${newsletter.n8n.generate-path}") String generatePath,
      @Value("${newsletter.n8n.agent-generate-path:${newsletter.n8n.generate-path}}") String agentGeneratePath) {
    this.restClient = RestClient.builder().baseUrl(baseUrl).build();
    this.generatePath = generatePath;
    this.agentGeneratePath = agentGeneratePath;
  }

  public N8nRunResponse triggerGenerate(Map<String, Object> payload) {
    return restClient.post()
        .uri(generatePath)
        .contentType(MediaType.APPLICATION_JSON)
        .body(payload)
        .retrieve()
        .body(N8nRunResponse.class);
  }

  public N8nRunResponse triggerAgentGenerate(Map<String, Object> payload) {
    return restClient.post()
        .uri(agentGeneratePath)
        .contentType(MediaType.APPLICATION_JSON)
        .body(payload)
        .retrieve()
        .body(N8nRunResponse.class);
  }

  public record N8nRunResponse(String executionId, String status) {}
}
