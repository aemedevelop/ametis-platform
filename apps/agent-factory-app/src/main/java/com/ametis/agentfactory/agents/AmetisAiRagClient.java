package com.ametis.agentfactory.agents;

import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Component
public class AmetisAiRagClient {
  private final RestClient restClient;
  private final boolean enabled;

  public AmetisAiRagClient(@Value("${agent-factory.ametis-ai.rag-base-url:}") String ragBaseUrl) {
    String cleanBaseUrl = ragBaseUrl == null ? "" : ragBaseUrl.trim();
    enabled = !cleanBaseUrl.isBlank();
    restClient = enabled ? RestClient.builder().baseUrl(cleanBaseUrl).build() : null;
  }

  public void ingest(String repositoryNamespace, UUID agentId, UUID knowledgeBaseId) {
    if (!enabled) {
      return;
    }
    restClient.post()
        .uri(
            "/tenants/{tenantId}/agents/{agentId}/knowledge-bases/{knowledgeBaseId}/ingest",
            repositoryNamespace,
            agentId.toString(),
            knowledgeBaseId.toString())
        .retrieve()
        .onStatus(HttpStatusCode::isError, (request, response) -> {
          throw new ResponseStatusException(response.getStatusCode(), "error.agentPublishSyncFailed");
        })
        .toBodilessEntity();
  }
}
