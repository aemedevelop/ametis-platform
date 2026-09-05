package com.ametis.agentfactory.businesses;

import com.ametis.agentfactory.documents.RepositoryBinding;
import com.ametis.agentfactory.documents.RepositoryProvisioningService;
import com.ametis.agentfactory.documents.RepositoryStatus;
import com.ametis.agentfactory.drive.GoogleDriveRepository;
import jakarta.transaction.Transactional;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Provisiona la carpeta del negocio en el Drive del tenant:
 *   {tenant-workspace}/{negocio-slug}/
 * Dentro de ella cada base de conocimiento crea su propia subcarpeta.
 */
@Service
public class BusinessRepositoryProvisioningService {
  private final RepositoryProvisioningService tenantRepository;
  private final GoogleDriveRepository googleDriveRepository;
  private final BusinessRepository businessRepository;

  public BusinessRepositoryProvisioningService(
      RepositoryProvisioningService tenantRepository,
      GoogleDriveRepository googleDriveRepository,
      BusinessRepository businessRepository) {
    this.tenantRepository = tenantRepository;
    this.googleDriveRepository = googleDriveRepository;
    this.businessRepository = businessRepository;
  }

  @Transactional
  public Business ensureProvisioned(Business business) {
    if (business.getRepositoryStatus() == BusinessRepositoryStatus.ACTIVE
        && business.getWorkspaceSubfolderId() != null) {
      return business;
    }
    RepositoryBinding binding = tenantRepository.find(business.getTenantId());
    if (binding.getStatus() != RepositoryStatus.ACTIVE || binding.getWorkspaceFolderId() == null) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.repositoryNotActive");
    }
    try {
      String folderId = googleDriveRepository.provisionFolder(
          business.getTenantId(),
          binding.getWorkspaceFolderId(),
          business.getSlug(),
          Map.of("businessId", business.getId().toString(), "businessName", business.getName(), "purpose", "business"));
      business.markRepositoryActive(folderId);
      return businessRepository.save(business);
    } catch (Exception exception) {
      business.markRepositoryError(rootMessage(exception));
      businessRepository.save(business);
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "error.driveProvisioningFailed", exception);
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
