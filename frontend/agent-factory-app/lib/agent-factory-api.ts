import { clearSession, getActiveTenantId, getAuthToken, setActiveTenantId } from "@/lib/session";

const API_BASE_URL = process.env.NEXT_PUBLIC_AGENT_FACTORY_API_BASE_URL ?? "http://localhost:8000";
const CORE_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type RepositoryStatus = {
  provider: string;
  repositoryNamespace: string;
  status: "PROVISIONING" | "ACTIVE" | "ERROR";
  lastError: string | null;
  updatedAt: string;
};

export type DriveConnection = {
  status: "CONNECTED" | "NOT_CONNECTED" | "NOT_CONFIGURED";
  accountEmail: string | null;
  connectedAt: string | null;
};

export type StoredDocument = {
  driveFileId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  status: "UPLOADING" | "STORED" | "FAILED";
  sha256: string | null;
  createdBy: string | null;
  createdAt: string;
  modifiedAt: string;
  webViewLink: string | null;
};

export class AgentFactoryApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public variables?: Record<string, string | number>
  ) {
    super(code);
    this.name = "AgentFactoryApiError";
  }
}

async function resolveTenant(token: string): Promise<string> {
  const existing = getActiveTenantId();
  if (existing) return existing;
  const response = await fetch(`${CORE_API_BASE_URL}/v1/tenants`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  if (response.status === 401) expireSession();
  if (!response.ok) throw new AgentFactoryApiError(response.status, "error.workspaceResolve");
  const tenants = (await response.json()) as Array<{ id: string }>;
  if (!tenants[0]) throw new AgentFactoryApiError(404, "error.workspaceMissing");
  setActiveTenantId(tenants[0].id);
  return tenants[0].id;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await authenticatedFetch(path, options);
  return response.json() as Promise<T>;
}

async function authenticatedFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  if (!token) throw new AgentFactoryApiError(401, "error.sessionExpired");
  const tenantId = await resolveTenant(token);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Tenant-Id": tenantId,
      ...(options.headers ?? {})
    },
    cache: "no-store"
  });
  if (!response.ok) {
    if (response.status === 401) expireSession();
    const payload = await response.clone().json().catch(() => null) as { message?: unknown } | null;
    const responseCode = typeof payload?.message === "string" && payload.message.startsWith("error.")
      ? payload.message
      : "error.operationFailed";
    throw new AgentFactoryApiError(response.status, responseCode, { status: response.status });
  }
  return response;
}

function expireSession(): never {
  clearSession();
  window.location.replace(`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`);
  throw new AgentFactoryApiError(401, "error.sessionExpired");
}

export function fetchRepository() {
  return apiFetch<RepositoryStatus>("/api/agent-factory/repository");
}

export function fetchDriveConnection() {
  return apiFetch<DriveConnection>("/api/agent-factory/drive/connection");
}

export function startDriveConnection() {
  return apiFetch<{ authorizationUrl: string }>("/api/agent-factory/drive/connection/authorize", { method: "POST" });
}

export function provisionRepository() {
  return apiFetch<RepositoryStatus>("/api/agent-factory/repository/provision", { method: "POST" });
}

export function fetchDocuments() {
  return apiFetch<StoredDocument[]>("/api/agent-factory/documents");
}

export function uploadDocument(file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<StoredDocument>("/api/agent-factory/documents", { method: "POST", body: form });
}

export async function deleteDocument(document: StoredDocument): Promise<void> {
  await authenticatedFetch(`/api/agent-factory/documents/${document.driveFileId}`, { method: "DELETE" });
}

export async function downloadDocument(document: StoredDocument): Promise<void> {
  const token = getAuthToken();
  if (!token) throw new AgentFactoryApiError(401, "error.sessionExpired");
  const tenantId = await resolveTenant(token);
  const response = await fetch(`${API_BASE_URL}/api/agent-factory/documents/${document.driveFileId}/download`, {
    headers: { Authorization: `Bearer ${token}`, "X-Tenant-Id": tenantId }
  });
  if (!response.ok) throw new AgentFactoryApiError(response.status, "error.downloadFailed");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = document.name;
  anchor.click();
  URL.revokeObjectURL(url);
}
