package com.ametis.agentfactory.businesses;

import com.ametis.agentfactory.agents.AgentRepository;
import com.ametis.agentfactory.agents.AmetisAiRagClient;
import com.ametis.agentfactory.documents.DocumentAssetRepository;
import com.ametis.agentfactory.documents.RepositoryBinding;
import com.ametis.agentfactory.documents.RepositoryProvisioningService;
import com.ametis.agentfactory.drive.GoogleDriveRepository;
import com.ametis.agentfactory.knowledge.KnowledgeBaseRepository;
import jakarta.transaction.Transactional;
import java.util.Locale;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Borrado físico de un negocio y de todo lo suyo (agentes, bases, documentos,
 * despliegues, carpeta de Drive y datos en el RAG). Deja una fila de auditoría.
 *
 * <p>Requisitos: el negocio debe estar ARCHIVADO y el llamante debe confirmar
 * escribiendo su nombre exacto.
 */
@Service
public class BusinessDeletionService {
  private static final Logger LOGGER = LoggerFactory.getLogger(BusinessDeletionService.class);

  private final BusinessRepository businessRepository;
  private final BusinessDeletionLogRepository deletionLogRepository;
  private final AgentRepository agentRepository;
  private final KnowledgeBaseRepository knowledgeBaseRepository;
  private final DocumentAssetRepository documentAssetRepository;
  private final RepositoryProvisioningService tenantRepository;
  private final GoogleDriveRepository googleDriveRepository;
  private final AmetisAiRagClient ragClient;

  public BusinessDeletionService(
      BusinessRepository businessRepository,
      BusinessDeletionLogRepository deletionLogRepository,
      AgentRepository agentRepository,
      KnowledgeBaseRepository knowledgeBaseRepository,
      DocumentAssetRepository documentAssetRepository,
      RepositoryProvisioningService tenantRepository,
      GoogleDriveRepository googleDriveRepository,
      AmetisAiRagClient ragClient) {
    this.businessRepository = businessRepository;
    this.deletionLogRepository = deletionLogRepository;
    this.agentRepository = agentRepository;
    this.knowledgeBaseRepository = knowledgeBaseRepository;
    this.documentAssetRepository = documentAssetRepository;
    this.tenantRepository = tenantRepository;
    this.googleDriveRepository = googleDriveRepository;
    this.ragClient = ragClient;
  }

  @Transactional
  public void delete(UUID tenantId, UUID businessId, UUID userId, String confirmationName) {
    Business business = businessRepository.findByIdAndTenantId(businessId, tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.businessNotFound"));
    if (business.getStatus() != BusinessStatus.ARCHIVED) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.businessDeleteRequiresArchived");
    }
    String provided = confirmationName == null ? "" : confirmationName.trim();
    if (!provided.toLowerCase(Locale.ROOT).equals(business.getName().toLowerCase(Locale.ROOT))) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "error.businessDeleteConfirmationMismatch");
    }

    int agents = (int) agentRepository.countByBusinessId(businessId);
    int knowledgeBases = (int) knowledgeBaseRepository.countByBusinessId(businessId);
    int documents = (int) documentAssetRepository.countByBusinessId(businessId);

    // Orden por FKs: agentes (cascada en BD -> despliegues, perfiles, agent_knowledge_bases),
    // luego documentos, luego bases, luego el negocio.
    agentRepository.deleteByBusinessId(businessId);
    documentAssetRepository.deleteByBusinessId(businessId);
    knowledgeBaseRepository.deleteByBusinessId(businessId);
    businessRepository.delete(business);

    deletionLogRepository.save(
        BusinessDeletionLog.of(business, agents, knowledgeBases, documents, userId));

    // Best-effort fuera de la BD: Drive a la papelera (recuperable 30 días) y RAG.
    trashDriveFolder(business);
    deleteRagData(business);

    LOGGER.info(
        "Negocio eliminado | tenant={} business={} name='{}' agents={} bases={} docs={}",
        tenantId, businessId, business.getName(), agents, knowledgeBases, documents);
  }

  private void trashDriveFolder(Business business) {
    if (business.getWorkspaceSubfolderId() == null) {
      return;
    }
    try {
      googleDriveRepository.trash(business.getTenantId(), business.getWorkspaceSubfolderId());
    } catch (Exception exception) {
      LOGGER.warn("No se pudo enviar a la papelera la carpeta del negocio {}", business.getId(), exception);
    }
  }

  private void deleteRagData(Business business) {
    try {
      RepositoryBinding binding = tenantRepository.find(business.getTenantId());
      ragClient.deleteBusiness(binding.getRepositoryNamespace(), business.getId().toString());
    } catch (Exception exception) {
      LOGGER.warn(
          "No se pudo borrar en el RAG el negocio {}; huérfanos aislados por el filtro business_id",
          business.getId(), exception);
    }
  }
}
