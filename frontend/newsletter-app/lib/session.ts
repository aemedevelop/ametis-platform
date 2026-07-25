export function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem("core_access_token") || window.sessionStorage.getItem("core_access_token");
}

export function getActiveTenantId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem("active_tenant_id") || window.sessionStorage.getItem("active_tenant_id");
}

export function setActiveTenantId(tenantId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem("active_tenant_id", tenantId);
  window.sessionStorage.removeItem("active_tenant_id");
}

export function clearSessionTokens(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem("core_access_token");
  window.localStorage.removeItem("core_refresh_token");
  window.localStorage.removeItem("active_tenant_id");
  window.sessionStorage.removeItem("core_access_token");
  window.sessionStorage.removeItem("core_refresh_token");
  window.sessionStorage.removeItem("active_tenant_id");
}
