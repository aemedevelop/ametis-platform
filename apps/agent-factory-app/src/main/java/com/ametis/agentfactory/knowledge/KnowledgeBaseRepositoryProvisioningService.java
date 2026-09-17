package com.ametis.agentfactory.knowledge;

import com.ametis.agentfactory.businesses.Business;
import com.ametis.agentfactory.businesses.BusinessRepositoryProvisioningService;
import com.ametis.agentfactory.businesses.BusinessRepositoryStatus;
import com.ametis.agentfactory.storage.StorageProvider;
import jakarta.transaction.Transactional;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Provisiona el contenedor propio de una base de conocimiento:
 *   {tenant-workspace}/{negocio-slug}/{base-slug}/
 */
@Service
public class KnowledgeBaseRepositoryProvisioningService {
  private final BusinessRepositoryProvisioningService businessProvisioning;
  private final StorageProvider storageProvider;
  private final KnowledgeBaseRepository knowledgeBaseRepository;

  public KnowledgeBaseRepositoryProvisioningService(
      BusinessRepositoryProvisioningService businessProvisioning,
      StorageProvider storageProvider,
      KnowledgeBaseRepository knowledgeBaseRepository) {
    this.businessProvisioning = businessProvisioning;
    this.storageProvider = storageProvider;
    this.knowledgeBaseRepository = knowledgeBaseRepository;
  }

  @Transactional
  public KnowledgeBase ensureProvisioned(Business business, KnowledgeBase base) {
    if (base.getRepositoryStatus() == BusinessRepositoryStatus.ACTIVE
        && base.getDocumentsLocator() != null) {
      return base;
    }
    Business readyBusiness = businessProvisioning.ensureProvisioned(business);
    try {
      String locator = storageProvider.provisionContainer(
          base.getTenantId(),
          readyBusiness.getStorageLocator(),
          base.folderName(),
          Map.of(
              "knowledgeBaseId", base.getId().toString(),
              "knowledgeBaseName", base.getName(),
              "businessId", base.getBusinessId().toString(),
              "purpose", "knowledge-base"));
      base.markRepositoryActive(locator);
      return knowledgeBaseRepository.save(base);
    } catch (Exception exception) {
      base.markRepositoryError(rootMessage(exception));
      knowledgeBaseRepository.save(base);
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
