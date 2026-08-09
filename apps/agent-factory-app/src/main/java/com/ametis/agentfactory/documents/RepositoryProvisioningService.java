package com.ametis.agentfactory.documents;

import com.ametis.agentfactory.access.CorePlatformClient;
import com.ametis.agentfactory.drive.GoogleDriveRepository;
import java.text.Normalizer;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RepositoryProvisioningService {
  private final RepositoryBindingRepository bindingRepository;
  private final GoogleDriveRepository googleDriveRepository;

  public RepositoryProvisioningService(
      RepositoryBindingRepository bindingRepository,
      GoogleDriveRepository googleDriveRepository) {
    this.bindingRepository = bindingRepository;
    this.googleDriveRepository = googleDriveRepository;
  }

  public RepositoryBinding find(UUID tenantId) {
    return bindingRepository.findByTenantId(tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document repository not provisioned"));
  }

  public RepositoryBinding provision(CorePlatformClient.TenantDto tenant) {
    String namespace = buildNamespace(tenant.slug(), tenant.name(), tenant.id());
    RepositoryBinding binding = bindingRepository.findByTenantId(tenant.id())
        .orElseGet(() -> RepositoryBinding.provisioning(tenant.id(), namespace));
    if (binding.getStatus() == RepositoryStatus.ACTIVE) {
      return binding;
    }
    binding.markProvisioning();
    bindingRepository.save(binding);
    try {
      GoogleDriveRepository.ProvisionedFolders folders = googleDriveRepository.provision(
          tenant.id(),
          tenant.id().toString(),
          normalizeSlug(tenant.slug(), tenant.name()),
          namespace,
          tenant.name());
      binding.activate(folders.namespace(), folders.workspaceFolderId(), folders.documentsFolderId());
      return bindingRepository.save(binding);
    } catch (Exception exception) {
      binding.fail(rootMessage(exception));
      bindingRepository.save(binding);
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Google Drive provisioning failed", exception);
    }
  }

  private String buildNamespace(String tenantSlug, String tenantName, UUID tenantId) {
    return normalizeSlug(tenantSlug, tenantName) + "--" + tenantId.toString().substring(0, 8);
  }

  private String normalizeSlug(String tenantSlug, String tenantName) {
    String source = tenantSlug == null || tenantSlug.isBlank() ? tenantName : tenantSlug;
    String normalized = Normalizer.normalize(source == null ? "workspace" : source, Normalizer.Form.NFD)
        .replaceAll("\\p{M}", "")
        .toLowerCase(Locale.ROOT)
        .replaceAll("[^a-z0-9]+", "-")
        .replaceAll("^-+|-+$", "");
    if (normalized.isBlank()) {
      normalized = "workspace";
    }
    return normalized.substring(0, Math.min(normalized.length(), 50));
  }

  private String rootMessage(Throwable throwable) {
    Throwable current = throwable;
    while (current.getCause() != null) {
      current = current.getCause();
    }
    return current.getMessage();
  }
}
