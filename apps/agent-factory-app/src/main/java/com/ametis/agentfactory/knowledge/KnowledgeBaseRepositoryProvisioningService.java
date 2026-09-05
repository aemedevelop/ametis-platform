package com.ametis.agentfactory.knowledge;

import com.ametis.agentfactory.businesses.Business;
import com.ametis.agentfactory.businesses.BusinessRepositoryProvisioningService;
import com.ametis.agentfactory.businesses.BusinessRepositoryStatus;
import com.ametis.agentfactory.drive.GoogleDriveRepository;
import jakarta.transaction.Transactional;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Provisiona la carpeta propia de una base de conocimiento:
 *   {tenant-workspace}/{negocio-slug}/{base-slug}/
 */
@Service
public class KnowledgeBaseRepositoryProvisioningService {
  private final BusinessRepositoryProvisioningService businessProvisioning;
  private final GoogleDriveRepository googleDriveRepository;
  private final KnowledgeBaseRepository knowledgeBaseRepository;

  public KnowledgeBaseRepositoryProvisioningService(
      BusinessRepositoryProvisioningService businessProvisioning,
      GoogleDriveRepository googleDriveRepository,
      KnowledgeBaseRepository knowledgeBaseRepository) {
    this.businessProvisioning = businessProvisioning;
    this.googleDriveRepository = googleDriveRepository;
    this.knowledgeBaseRepository = knowledgeBaseRepository;
  }

  @Transactional
  public KnowledgeBase ensureProvisioned(Business business, KnowledgeBase base) {
    if (base.getRepositoryStatus() == BusinessRepositoryStatus.ACTIVE
        && base.getDocumentsFolderId() != null) {
      return base;
    }
    Business readyBusiness = businessProvisioning.ensureProvisioned(business);
    try {
      String folderId = googleDriveRepository.provisionFolder(
          base.getTenantId(),
          readyBusiness.getWorkspaceSubfolderId(),
          base.folderName(),
          Map.of(
              "knowledgeBaseId", base.getId().toString(),
              "knowledgeBaseName", base.getName(),
              "businessId", base.getBusinessId().toString(),
              "purpose", "knowledge-base"));
      base.markRepositoryActive(folderId);
      return knowledgeBaseRepository.save(base);
    } catch (Exception exception) {
      base.markRepositoryError(rootMessage(exception));
      knowledgeBaseRepository.save(base);
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
