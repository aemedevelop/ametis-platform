package com.ametis.agentfactory.agents;

import java.util.UUID;
import java.util.List;
import org.springframework.core.ParameterizedTypeReference;
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

  public void syncAgent(AmetisAiAgentSyncPayload payload) {
    if (!enabled) {
      return;
    }
    restClient.post()
        .uri("/agents/sync")
        .body(payload)
        .retrieve()
        .onStatus(HttpStatusCode::isError, (request, response) -> {
          throw new ResponseStatusException(response.getStatusCode(), "error.agentPublishSyncFailed");
        })
        .toBodilessEntity();
  }

  public AmetisAiCreateIndexingJobsResponse createIndexingJobs(
      String repositoryNamespace,
      UUID agentId,
      UUID requestedBy) {
    if (!enabled) {
      return new AmetisAiCreateIndexingJobsResponse("disabled", repositoryNamespace, agentId.toString(), List.of());
    }
    return restClient.post()
        .uri("/agents/{agentId}/indexing-jobs", agentId.toString())
        .body(new AmetisAiIndexingJobRequest(
            repositoryNamespace,
            requestedBy == null ? null : requestedBy.toString()))
        .retrieve()
        .onStatus(HttpStatusCode::isError, (request, response) -> {
          throw new ResponseStatusException(response.getStatusCode(), "error.agentIndexingJobFailed");
        })
        .body(AmetisAiCreateIndexingJobsResponse.class);
  }

  public List<AgentIndexingJobResponse> latestIndexingJobs(String repositoryNamespace, UUID agentId) {
    if (!enabled) {
      return List.of();
    }
    return restClient.get()
        .uri(
            "/tenants/{tenantId}/agents/{agentId}/indexing-jobs/latest",
            repositoryNamespace,
            agentId.toString())
        .retrieve()
        .onStatus(HttpStatusCode::isError, (request, response) -> {
          throw new ResponseStatusException(response.getStatusCode(), "error.agentIndexingStatusFailed");
        })
        .body(new ParameterizedTypeReference<List<AgentIndexingJobResponse>>() {});
  }

  public AmetisAiQueryResponse query(
      String repositoryNamespace,
      UUID agentId,
      UUID knowledgeBaseId,
      String question) {
    if (!enabled) {
      throw new ResponseStatusException(HttpStatusCode.valueOf(503), "error.agentTestUnavailable");
    }
    return restClient.post()
        .uri(
            "/tenants/{tenantId}/agents/{agentId}/knowledge-bases/{knowledgeBaseId}/query",
            repositoryNamespace,
            agentId.toString(),
            knowledgeBaseId.toString())
        .body(new AmetisAiQueryRequest(question))
        .retrieve()
        .onStatus(HttpStatusCode::isError, (request, response) -> {
          throw new ResponseStatusException(response.getStatusCode(), "error.agentTestFailed");
        })
        .body(AmetisAiQueryResponse.class);
  }
}
