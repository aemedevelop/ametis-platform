package com.ametis.agentfactory.documents;

import jakarta.validation.constraints.Size;

public record RepositoryNamespaceRequest(
    @Size(max = 80) String repositoryNamespace) {}
