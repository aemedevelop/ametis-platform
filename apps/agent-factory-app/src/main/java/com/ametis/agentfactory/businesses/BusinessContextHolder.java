package com.ametis.agentfactory.businesses;

import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Negocio activo de la petición, tomado de la cabecera {@code X-Business-Id}.
 * Mismo patrón que TenantContextHolder.
 */
public final class BusinessContextHolder {
  private static final ThreadLocal<UUID> CURRENT = new ThreadLocal<>();

  private BusinessContextHolder() {}

  public static void set(UUID businessId) {
    CURRENT.set(businessId);
  }

  public static UUID requireBusinessId() {
    UUID businessId = CURRENT.get();
    if (businessId == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "error.businessRequired");
    }
    return businessId;
  }

  public static void clear() {
    CURRENT.remove();
  }
}
