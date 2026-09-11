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

  public void syncSuggestionIndex(
      String repositoryNamespace, String businessId, UUID agentId, List<AmetisAiSuggestionItem> items) {
    if (!enabled) {
      return;
    }
    restClient.put()
        .uri("/agents/{agentId}/suggestion-index", agentId.toString())
        .body(new AmetisAiSuggestionIndexRequest(repositoryNamespace, businessId, items))
        .retrieve()
        .onStatus(HttpStatusCode::isError, (request, response) -> {
          throw new ResponseStatusException(response.getStatusCode(), "error.agentSuggestionIndexFailed");
        })
        .toBodilessEntity();
  }

  public void deleteSuggestionIndex(String repositoryNamespace, UUID agentId) {
    if (!enabled) {
      return;
    }
    restClient.delete()
        .uri(uriBuilder -> uriBuilder
            .path("/agents/{agentId}/suggestion-index")
            .queryParam("tenant_id", repositoryNamespace)
            .build(agentId.toString()))
        .retrieve()
        .onStatus(HttpStatusCode::isError, (request, response) -> {
          throw new ResponseStatusException(response.getStatusCode(), "error.agentSuggestionIndexFailed");
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

  /**
   * Borra en el RAG todos los datos de un negocio: filas sincronizadas y los
   * vectores de Qdrant con {@code business_id = businessId}. Best-effort: si
   * falla, los huérfanos quedan aislados por el filtro y se limpian aparte.
   */
  public void deleteBusiness(String repositoryNamespace, String businessId) {
    if (!enabled) {
      return;
    }
    restClient.delete()
        .uri(uriBuilder -> uriBuilder
            .path("/businesses/{businessId}")
            .queryParam("tenant_id", repositoryNamespace)
            .build(businessId))
        .retrieve()
        .onStatus(HttpStatusCode::isError, (request, response) -> {
          throw new ResponseStatusException(response.getStatusCode(), "error.businessRagDeleteFailed");
        })
        .toBodilessEntity();
  }

  public AmetisAiCreateIndexingJobsResponse createIndexingJobs(
      String repositoryNamespace,
      String businessId,
      UUID agentId,
      UUID requestedBy) {
    if (!enabled) {
      return new AmetisAiCreateIndexingJobsResponse("disabled", repositoryNamespace, agentId.toString(), List.of());
    }
    return restClient.post()
        .uri("/agents/{agentId}/indexing-jobs", agentId.toString())
        .body(new AmetisAiIndexingJobRequest(
            repositoryNamespace,
            businessId,
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
      String businessId,
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
        .body(new AmetisAiQueryRequest(question, businessId))
        .retrieve()
        .onStatus(HttpStatusCode::isError, (request, response) -> {
          throw new ResponseStatusException(response.getStatusCode(), "error.agentTestFailed");
        })
        .body(AmetisAiQueryResponse.class);
  }
}
