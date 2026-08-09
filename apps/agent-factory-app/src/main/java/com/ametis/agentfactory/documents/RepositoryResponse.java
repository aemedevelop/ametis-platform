package com.ametis.agentfactory.documents;

import java.time.OffsetDateTime;

public record RepositoryResponse(
    String provider,
    String repositoryNamespace,
    RepositoryStatus status,
    String lastError,
    OffsetDateTime updatedAt) {
  public static RepositoryResponse from(RepositoryBinding binding) {
    return new RepositoryResponse(
        binding.getProvider(),
        binding.getRepositoryNamespace(),
        binding.getStatus(),
        binding.getLastError(),
        binding.getUpdatedAt());
  }
}
