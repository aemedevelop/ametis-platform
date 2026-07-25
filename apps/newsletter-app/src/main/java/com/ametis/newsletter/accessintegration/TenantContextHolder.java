package com.ametis.newsletter.accessintegration;

import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class TenantContextHolder {
  private static final ThreadLocal<TenantContext> CONTEXT = new ThreadLocal<>();

  private TenantContextHolder() {}

  public static void set(TenantContext context) {
    CONTEXT.set(context);
  }

  public static TenantContext get() {
    return CONTEXT.get();
  }

  public static UUID getTenantId() {
    TenantContext context = CONTEXT.get();
    return context == null ? null : context.tenantId();
  }

  public static UUID requireTenantId() {
    UUID tenantId = getTenantId();
    if (tenantId == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing tenant context");
    }
    return tenantId;
  }

  public static void clear() {
    CONTEXT.remove();
  }
}