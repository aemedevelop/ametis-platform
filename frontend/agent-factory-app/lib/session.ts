export type SessionTokens = {
  accessToken: string;
  refreshToken?: string | null;
};

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("core_access_token") || window.sessionStorage.getItem("core_access_token");
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("core_refresh_token") || window.sessionStorage.getItem("core_refresh_token");
}

export function storeSessionTokens(tokens: SessionTokens): void {
  if (typeof window === "undefined") return;
  const storage = getTokenStorage();
  const cleanupStorage = storage === window.localStorage ? window.sessionStorage : window.localStorage;
  cleanupStorage.removeItem("core_access_token");
  cleanupStorage.removeItem("core_refresh_token");
  storage.setItem("core_access_token", tokens.accessToken);
  if (tokens.refreshToken) storage.setItem("core_refresh_token", tokens.refreshToken);
}

export function isAuthTokenExpired(token: string, clockSkewSeconds = 15): boolean {
  try {
    const encodedPayload = token.split(".")[1];
    if (!encodedPayload) return true;
    const normalized = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");
    const payload = JSON.parse(window.atob(padded)) as { exp?: number };
    return typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000) + clockSkewSeconds;
  } catch {
    return true;
  }
}

export function getActiveTenantId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("active_tenant_id") || window.sessionStorage.getItem("active_tenant_id");
}

export function setActiveTenantId(tenantId: string): void {
  window.localStorage.setItem("active_tenant_id", tenantId);
  window.sessionStorage.removeItem("active_tenant_id");
}

export function clearSession(): void {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    storage.removeItem("core_access_token");
    storage.removeItem("core_refresh_token");
    storage.removeItem("active_tenant_id");
  }
}

function getTokenStorage(): Storage {
  if (window.localStorage.getItem("core_access_token") || window.localStorage.getItem("core_refresh_token")) {
    return window.localStorage;
  }
  if (window.sessionStorage.getItem("core_access_token") || window.sessionStorage.getItem("core_refresh_token")) {
    return window.sessionStorage;
  }
  return window.localStorage;
}
