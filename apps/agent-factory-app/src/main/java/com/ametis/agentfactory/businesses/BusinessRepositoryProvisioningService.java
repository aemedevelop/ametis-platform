package com.ametis.agentfactory.businesses;

import com.ametis.agentfactory.documents.RepositoryBinding;
import com.ametis.agentfactory.documents.RepositoryProvisioningService;
import com.ametis.agentfactory.documents.RepositoryStatus;
import com.ametis.agentfactory.storage.StorageProvider;
import jakarta.transaction.Transactional;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Provisiona el contenedor del negocio dentro del espacio del tenant:
 *   {tenant-workspace}/{negocio-slug}/
 * Dentro de él cada base de conocimiento crea su propio contenedor.
 */
@Service
public class BusinessRepositoryProvisioningService {
  private final RepositoryProvisioningService tenantRepository;
  private final StorageProvider storageProvider;
  private final BusinessRepository businessRepository;

  public BusinessRepositoryProvisioningService(
      RepositoryProvisioningService tenantRepository,
      StorageProvider storageProvider,
      BusinessRepository businessRepository) {
    this.tenantRepository = tenantRepository;
    this.storageProvider = storageProvider;
    this.businessRepository = businessRepository;
  }

  @Transactional
  public Business ensureProvisioned(Business business) {
    if (business.getRepositoryStatus() == BusinessRepositoryStatus.ACTIVE
        && business.getStorageLocator() != null) {
      return business;
    }
    RepositoryBinding binding = tenantRepository.find(business.getTenantId());
    if (binding.getStatus() != RepositoryStatus.ACTIVE || binding.getWorkspaceLocator() == null) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.repositoryNotActive");
    }
    try {
      String locator = storageProvider.provisionContainer(
          business.getTenantId(),
          binding.getWorkspaceLocator(),
          business.getSlug(),
          Map.of("businessId", business.getId().toString(), "businessName", business.getName(), "purpose", "business"));
      business.markRepositoryActive(locator);
      return businessRepository.save(business);
    } catch (Exception exception) {
      business.markRepositoryError(rootMessage(exception));
      businessRepository.save(business);
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "error.storageProvisioningFailed", exception);
    }
  }

  private String rootMessage(Throwable throwable) {
    Throwable current = throwable;
    while (current.getCause() != null) {
      current = current.getCause();
    }
    return current.getMessage();
  }
}
