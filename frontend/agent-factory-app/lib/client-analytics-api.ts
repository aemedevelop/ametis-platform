// API del cliente final para ver las analíticas de su agente. Es ajena a la
// sesión de la plataforma: se entra con el usuario y contraseña que definió el
// consultor, y la sesión resultante viaja en la cabecera X-Analytics-Session.

import { AgentAnalytics, AgentFactoryApiError, saveResponseAsFile } from "@/lib/agent-factory-api";

const API_BASE_URL = process.env.NEXT_PUBLIC_AGENT_FACTORY_API_BASE_URL ?? "http://localhost:8000";

export type ClientAnalyticsSession = {
  token: string;
  expiresAt: string;
  agentName: string;
};

function endpoint(publicId: string, path: string): string {
  return `${API_BASE_URL}/api/agent-factory/public/analytics/${encodeURIComponent(publicId)}${path}`;
}

function storageKey(publicId: string): string {
  return `analytics_client_session:${publicId}`;
}

/** Sesión guardada en esta pestaña, si sigue vigente. */
export function getClientAnalyticsSession(publicId: string): ClientAnalyticsSession | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey(publicId));
    const session = raw ? JSON.parse(raw) as ClientAnalyticsSession : null;
    return session && new Date(session.expiresAt).getTime() > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export function clearClientAnalyticsSession(publicId: string): void {
  window.sessionStorage.removeItem(storageKey(publicId));
}

async function failure(response: Response): Promise<AgentFactoryApiError> {
  const payload = await response.json().catch(() => null) as { message?: unknown } | null;
  const code = typeof payload?.message === "string" && payload.message.startsWith("error.")
    ? payload.message
    : "error.operationFailed";
  return new AgentFactoryApiError(response.status, code, { status: response.status });
}

export async function loginClientAnalytics(publicId: string, username: string, password: string): Promise<ClientAnalyticsSession> {
  const response = await fetch(endpoint(publicId, "/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store"
  });
  if (!response.ok) throw await failure(response);
  const session = await response.json() as ClientAnalyticsSession;
  window.sessionStorage.setItem(storageKey(publicId), JSON.stringify(session));
  return session;
}

async function sessionFetch(publicId: string, token: string, path: string): Promise<Response> {
  const response = await fetch(endpoint(publicId, path), {
    headers: { "X-Analytics-Session": token },
    cache: "no-store"
  });
  if (!response.ok) throw await failure(response);
  return response;
}

export async function fetchClientAnalytics(publicId: string, token: string, fromIso: string, toIso: string): Promise<AgentAnalytics> {
  const params = new URLSearchParams({ from: fromIso, to: toIso });
  const response = await sessionFetch(publicId, token, `/overview?${params}`);
  return response.json() as Promise<AgentAnalytics>;
}

export async function exportClientAnalytics(publicId: string, token: string, fromIso: string, toIso: string, lang: string): Promise<void> {
  const params = new URLSearchParams({ from: fromIso, to: toIso, lang });
  const response = await sessionFetch(publicId, token, `/export?${params}`);
  await saveResponseAsFile(response, "analytics.xlsx");
}
