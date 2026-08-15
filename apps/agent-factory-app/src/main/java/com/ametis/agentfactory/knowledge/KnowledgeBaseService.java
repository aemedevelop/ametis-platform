package com.ametis.agentfactory.knowledge;

import com.ametis.agentfactory.documents.DocumentAsset;
import com.ametis.agentfactory.documents.DocumentAssetRepository;
import com.ametis.agentfactory.documents.DocumentStatus;
import com.ametis.agentfactory.documents.RepositoryBinding;
import com.ametis.agentfactory.documents.RepositoryProvisioningService;
import com.ametis.agentfactory.documents.RepositoryStatus;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class KnowledgeBaseService {
  private final RepositoryProvisioningService provisioningService;
  private final KnowledgeBaseRepository knowledgeBaseRepository;
  private final KnowledgeBaseDocumentRepository knowledgeBaseDocumentRepository;
  private final DocumentAssetRepository documentAssetRepository;

  public KnowledgeBaseService(
      RepositoryProvisioningService provisioningService,
      KnowledgeBaseRepository knowledgeBaseRepository,
      KnowledgeBaseDocumentRepository knowledgeBaseDocumentRepository,
      DocumentAssetRepository documentAssetRepository) {
    this.provisioningService = provisioningService;
    this.knowledgeBaseRepository = knowledgeBaseRepository;
    this.knowledgeBaseDocumentRepository = knowledgeBaseDocumentRepository;
    this.documentAssetRepository = documentAssetRepository;
  }

  public List<KnowledgeBaseResponse> list(UUID tenantId) {
    requireActiveRepository(tenantId);
    List<KnowledgeBase> bases = knowledgeBaseRepository.findAllByTenantIdOrderByUpdatedAtDesc(tenantId);
    if (bases.isEmpty()) {
      return List.of();
    }
    List<UUID> baseIds = bases.stream().map(KnowledgeBase::getId).toList();
    List<KnowledgeBaseDocument> links = knowledgeBaseDocumentRepository.findAllByTenantIdAndKnowledgeBaseIdIn(tenantId, baseIds);
    List<UUID> documentIds = links.stream().map(KnowledgeBaseDocument::getDocumentAssetId).distinct().toList();
    Map<UUID, String> documentNames = documentAssetRepository.findAllByTenantIdAndIdIn(tenantId, documentIds).stream()
        .filter(document -> document.getStatus() == DocumentStatus.STORED)
        .collect(Collectors.toMap(DocumentAsset::getId, DocumentAsset::getOriginalName));
    List<KnowledgeBaseDocument> obsoleteLinks = links.stream()
        .filter(link -> !documentNames.containsKey(link.getDocumentAssetId()))
        .toList();
    if (!obsoleteLinks.isEmpty()) {
      knowledgeBaseDocumentRepository.deleteAll(obsoleteLinks);
    }
    Map<UUID, List<String>> namesByBase = links.stream()
        .filter(link -> documentNames.containsKey(link.getDocumentAssetId()))
        .collect(Collectors.groupingBy(
            KnowledgeBaseDocument::getKnowledgeBaseId,
            Collectors.mapping(link -> documentNames.get(link.getDocumentAssetId()), Collectors.filtering(name -> name != null, Collectors.toList()))));
    return bases.stream()
        .map(base -> KnowledgeBaseResponse.from(base, namesByBase.getOrDefault(base.getId(), List.of())))
        .toList();
  }

  @Transactional
  public KnowledgeBaseResponse create(UUID tenantId, UUID userId, KnowledgeBaseRequest request) {
    requireActiveRepository(tenantId);
    String name = cleanName(request.name());
    if (knowledgeBaseRepository.existsByTenantIdAndNameIgnoreCase(tenantId, name)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.knowledgeBaseNameTaken");
    }
    KnowledgeBase base = knowledgeBaseRepository.save(KnowledgeBase.create(tenantId, name, cleanDescription(request.description()), userId));
    List<DocumentAsset> documents = resolveDocuments(tenantId, request.documentDriveFileIds());
    knowledgeBaseDocumentRepository.saveAll(documents.stream()
        .map(document -> KnowledgeBaseDocument.link(tenantId, base.getId(), document.getId()))
        .toList());
    return KnowledgeBaseResponse.from(base, documents.stream().map(DocumentAsset::getOriginalName).toList());
  }

  @Transactional
  public KnowledgeBaseResponse update(UUID tenantId, UUID knowledgeBaseId, KnowledgeBaseRequest request) {
    requireActiveRepository(tenantId);
    KnowledgeBase base = knowledgeBaseRepository.findByIdAndTenantId(knowledgeBaseId, tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.knowledgeBaseNotFound"));
    String name = cleanName(request.name());
    if (knowledgeBaseRepository.existsByTenantIdAndNameIgnoreCaseAndIdNot(tenantId, name, knowledgeBaseId)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.knowledgeBaseNameTaken");
    }
    base.update(name, cleanDescription(request.description()));
    knowledgeBaseDocumentRepository.deleteAllByTenantIdAndKnowledgeBaseId(tenantId, knowledgeBaseId);
    List<DocumentAsset> documents = resolveDocuments(tenantId, request.documentDriveFileIds());
    knowledgeBaseDocumentRepository.saveAll(documents.stream()
        .map(document -> KnowledgeBaseDocument.link(tenantId, base.getId(), document.getId()))
        .toList());
    return KnowledgeBaseResponse.from(knowledgeBaseRepository.save(base), documents.stream().map(DocumentAsset::getOriginalName).toList());
  }

  @Transactional
  public void delete(UUID tenantId, UUID knowledgeBaseId) {
    requireActiveRepository(tenantId);
    KnowledgeBase base = knowledgeBaseRepository.findByIdAndTenantId(knowledgeBaseId, tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.knowledgeBaseNotFound"));
    knowledgeBaseDocumentRepository.deleteAllByTenantIdAndKnowledgeBaseId(tenantId, knowledgeBaseId);
    knowledgeBaseRepository.delete(base);
  }

  private void requireActiveRepository(UUID tenantId) {
    RepositoryBinding binding = provisioningService.find(tenantId);
    if (binding.getStatus() != RepositoryStatus.ACTIVE) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.repositoryNotActive");
    }
  }

  private List<DocumentAsset> resolveDocuments(UUID tenantId, List<String> driveFileIds) {
    List<String> uniqueDriveFileIds = driveFileIds == null ? List.of() : driveFileIds.stream()
        .filter(id -> id != null && !id.isBlank())
        .distinct()
        .toList();
    if (uniqueDriveFileIds.isEmpty()) {
      return List.of();
    }
    List<DocumentAsset> documents = documentAssetRepository.findAllByTenantIdAndDriveFileIdIn(tenantId, uniqueDriveFileIds);
    if (documents.size() != uniqueDriveFileIds.size() || documents.stream().anyMatch(document -> document.getStatus() != DocumentStatus.STORED)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "error.knowledgeBaseInvalidDocuments");
    }
    return documents;
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
