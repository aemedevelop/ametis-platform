package com.ametis.agentfactory.documents;

import java.time.OffsetDateTime;

public record RepositoryResponse(
    String provider,
    String repositoryNamespace,
    String repositoryAlias,
    String repositoryTechnicalId,
    RepositoryStatus status,
    String lastError,
    OffsetDateTime updatedAt) {
  public static RepositoryResponse from(RepositoryBinding binding) {
    return new RepositoryResponse(
        binding.getProvider(),
        binding.getRepositoryNamespace(),
        aliasOf(binding),
        technicalIdOf(binding),
        binding.getStatus(),
        binding.getLastError(),
        binding.getUpdatedAt());
  }

  private static String aliasOf(RepositoryBinding binding) {
    String suffix = "--" + technicalIdOf(binding);
    String namespace = binding.getRepositoryNamespace();
    return namespace.endsWith(suffix) ? namespace.substring(0, namespace.length() - suffix.length()) : namespace;
  }

  private static String technicalIdOf(RepositoryBinding binding) {
    return binding.getTenantId().toString().substring(0, 8);
  }
}
