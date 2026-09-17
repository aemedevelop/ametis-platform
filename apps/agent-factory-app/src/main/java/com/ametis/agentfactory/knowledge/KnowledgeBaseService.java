package com.ametis.agentfactory.knowledge;

import com.ametis.agentfactory.businesses.Business;
import com.ametis.agentfactory.documents.DocumentAsset;
import com.ametis.agentfactory.documents.DocumentAssetRepository;
import com.ametis.agentfactory.documents.DocumentStatus;
import com.ametis.agentfactory.documents.RepositoryBinding;
import com.ametis.agentfactory.documents.RepositoryProvisioningService;
import com.ametis.agentfactory.documents.RepositoryStatus;
import com.ametis.agentfactory.storage.StorageProvider;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class KnowledgeBaseService {
  private static final Logger LOGGER = LoggerFactory.getLogger(KnowledgeBaseService.class);

  private final RepositoryProvisioningService provisioningService;
  private final KnowledgeBaseRepository knowledgeBaseRepository;
  private final KnowledgeBaseRepositoryProvisioningService knowledgeBaseProvisioning;
  private final DocumentAssetRepository documentAssetRepository;
  private final StorageProvider storageProvider;

  public KnowledgeBaseService(
      RepositoryProvisioningService provisioningService,
      KnowledgeBaseRepository knowledgeBaseRepository,
      KnowledgeBaseRepositoryProvisioningService knowledgeBaseProvisioning,
      DocumentAssetRepository documentAssetRepository,
      StorageProvider storageProvider) {
    this.provisioningService = provisioningService;
    this.knowledgeBaseRepository = knowledgeBaseRepository;
    this.knowledgeBaseProvisioning = knowledgeBaseProvisioning;
    this.documentAssetRepository = documentAssetRepository;
    this.storageProvider = storageProvider;
  }

  public List<KnowledgeBaseResponse> list(Business business) {
    requireActiveRepository(business.getTenantId());
    List<KnowledgeBase> bases = knowledgeBaseRepository.findAllByBusinessIdOrderByUpdatedAtDesc(business.getId());
    if (bases.isEmpty()) {
      return List.of();
    }
    List<UUID> baseIds = bases.stream().map(KnowledgeBase::getId).toList();
    Map<UUID, Long> storedByBase = documentAssetRepository.findAllByKnowledgeBaseIdIn(baseIds).stream()
        .filter(asset -> asset.getStatus() == DocumentStatus.STORED)
        .collect(Collectors.groupingBy(DocumentAsset::getKnowledgeBaseId, Collectors.counting()));
    return bases.stream()
        .map(base -> KnowledgeBaseResponse.from(base, storedByBase.getOrDefault(base.getId(), 0L)))
        .toList();
  }

  @Transactional
  public KnowledgeBaseResponse create(Business business, UUID userId, KnowledgeBaseRequest request) {
    requireActiveRepository(business.getTenantId());
    String name = cleanName(request.name());
    if (knowledgeBaseRepository.existsByBusinessIdAndNameIgnoreCase(business.getId(), name)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.knowledgeBaseNameTaken");
    }
    KnowledgeBase base = knowledgeBaseRepository.save(
        KnowledgeBase.create(business.getTenantId(), business.getId(), name, cleanDescription(request.description()), userId));
    tryProvision(business, base);
    return KnowledgeBaseResponse.from(base, 0L);
  }

  @Transactional
  public KnowledgeBaseResponse update(Business business, UUID knowledgeBaseId, KnowledgeBaseRequest request) {
    requireActiveRepository(business.getTenantId());
    KnowledgeBase base = requireBase(business, knowledgeBaseId);
    String name = cleanName(request.name());
    if (knowledgeBaseRepository.existsByBusinessIdAndNameIgnoreCaseAndIdNot(business.getId(), name, knowledgeBaseId)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.knowledgeBaseNameTaken");
    }
    base.update(name, cleanDescription(request.description()));
    long stored = documentAssetRepository.countByKnowledgeBaseIdAndStatus(knowledgeBaseId, DocumentStatus.STORED);
    return KnowledgeBaseResponse.from(knowledgeBaseRepository.save(base), stored);
  }

  @Transactional
  public void delete(Business business, UUID knowledgeBaseId) {
    requireActiveRepository(business.getTenantId());
    KnowledgeBase base = requireBase(business, knowledgeBaseId);
    if (base.getDocumentsLocator() != null) {
      try {
        storageProvider.deleteContainer(business.getTenantId(), base.getDocumentsLocator());
      } catch (Exception exception) {
        LOGGER.warn("No se pudo enviar a la papelera la carpeta de la base {}", knowledgeBaseId, exception);
      }
    }
    documentAssetRepository.deleteAllByKnowledgeBaseId(knowledgeBaseId);
    knowledgeBaseRepository.delete(base);
  }

  private void tryProvision(Business business, KnowledgeBase base) {
    try {
      knowledgeBaseProvisioning.ensureProvisioned(business, base);
    } catch (Exception exception) {
      // Queda PENDING; se reintenta al gestionar sus documentos.
      LOGGER.warn("No se pudo provisionar la carpeta de la base {} al crearla", base.getId(), exception);
    }
  }

  private KnowledgeBase requireBase(Business business, UUID knowledgeBaseId) {
    return knowledgeBaseRepository.findByIdAndBusinessId(knowledgeBaseId, business.getId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.knowledgeBaseNotFound"));
  }

  private void requireActiveRepository(UUID tenantId) {
    RepositoryBinding binding = provisioningService.find(tenantId);
    if (binding.getStatus() != RepositoryStatus.ACTIVE) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.repositoryNotActive");
    }
  }

  private String cleanName(String name) {
    String cleaned = name == null ? "" : name.trim();
    if (cleaned.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "error.knowledgeBaseNameRequired");
    }
    return cleaned;
  }

  private String cleanDescription(String description) {
    String cleaned = description == null ? "" : description.trim();
    return cleaned.isBlank() ? null : cleaned;
  }
}
