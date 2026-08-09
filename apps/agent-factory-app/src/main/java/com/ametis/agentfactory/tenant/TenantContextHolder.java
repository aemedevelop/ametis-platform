package com.ametis.agentfactory.tenant;

import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class TenantContextHolder {
  private static final ThreadLocal<UUID> CURRENT = new ThreadLocal<>();

  private TenantContextHolder() {}

  public static void set(UUID tenantId) {
    CURRENT.set(tenantId);
  }

  public static UUID requireTenantId() {
    UUID tenantId = CURRENT.get();
    if (tenantId == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing X-Tenant-Id");
    }
    return tenantId;
  }

  public static void clear() {
    CURRENT.remove();
  }
}
