package com.ametis.agentfactory.businesses;

import jakarta.transaction.Transactional;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BusinessService {
  private final BusinessRepository businessRepository;

  public BusinessService(BusinessRepository businessRepository) {
    this.businessRepository = businessRepository;
  }

  public List<BusinessResponse> list(UUID tenantId) {
    return businessRepository.findAllByTenantIdOrderByNameAsc(tenantId).stream()
        .map(BusinessResponse::from)
        .toList();
  }

  /**
   * Valida que el negocio activo (cabecera X-Business-Id) pertenece al tenant.
   * Lo usan el resto de módulos para encerrar sus operaciones en un negocio.
   */
  public Business require(UUID tenantId, UUID businessId) {
    if (businessId == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "error.businessRequired");
    }
    return businessRepository.findByIdAndTenantId(businessId, tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "error.businessNotFound"));
  }

  @Transactional
  public BusinessResponse create(UUID tenantId, UUID userId, BusinessRequest request) {
    String name = cleanName(request.name());
    if (businessRepository.existsByTenantIdAndNameIgnoreCase(tenantId, name)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.businessNameTaken");
    }
    String slug = uniqueSlug(tenantId, name);
    Business business = businessRepository.save(
        Business.create(tenantId, name, slug, cleanText(request.description()), userId));
    return BusinessResponse.from(business);
  }

  @Transactional
  public BusinessResponse update(UUID tenantId, UUID businessId, BusinessRequest request) {
    Business business = require(tenantId, businessId);
    String name = cleanName(request.name());
    if (businessRepository.existsByTenantIdAndNameIgnoreCaseAndIdNot(tenantId, name, businessId)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "error.businessNameTaken");
    }
    business.update(
        name,
        cleanText(request.description()),
        request.status() == null ? business.getStatus() : request.status());
    return BusinessResponse.from(businessRepository.save(business));
  }

  private String uniqueSlug(UUID tenantId, String name) {
    String base = slugify(name);
    String candidate = base;
    int suffix = 2;
    while (businessRepository.existsByTenantIdAndSlug(tenantId, candidate)) {
      candidate = base + "-" + suffix++;
    }
    return candidate;
  }

  private String slugify(String value) {
    String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
        .replaceAll("\\p{M}", "")
        .toLowerCase(Locale.ROOT)
        .replaceAll("[^a-z0-9]+", "-")
        .replaceAll("^-+|-+$", "");
    if (normalized.isBlank()) {
      normalized = "negocio";
    }
    return normalized.substring(0, Math.min(normalized.length(), 70));
  }

  private String cleanName(String name) {
    String cleaned = name == null ? "" : name.trim();
    if (cleaned.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "error.businessNameRequired");
    }
    return cleaned;
  }

  private String cleanText(String value) {
    String cleaned = value == null ? "" : value.trim();
    return cleaned.isBlank() ? null : cleaned;
  }
}
