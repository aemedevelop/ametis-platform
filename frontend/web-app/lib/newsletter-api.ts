import { getAuthToken } from "@/lib/session";

const NEWSLETTER_API_BASE_URL = process.env.NEXT_PUBLIC_NEWSLETTER_API_BASE_URL ?? "http://localhost:8082";

export type Source = {
  id: string;
  tenantId: string;
  name: string;
  type: "RSS" | "API" | "URL";
  url: string;
  active: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  createdAt: string;
};

export type Project = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  language: string;
  tone: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  createdAt: string;
};

export type Publication = {
  id: string;
  tenantId: string;
  projectId: string;
  title: string;
  content: string | null;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED";
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
};

function getTenantHeader(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem("active_tenant_id") || window.sessionStorage.getItem("active_tenant_id") || undefined;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const tenantId = getTenantHeader();
  const response = await fetch(`${NEWSLETTER_API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(tenantId ? { "X-Tenant-Id": tenantId } : {}),
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchSources() {
  return apiFetch<Source[]>("/v1/sources");
}

export function fetchSourcesIncludingDeleted() {
  return apiFetch<Source[]>("/v1/sources?includeDeleted=true");
}

export function fetchProjects() {
  return apiFetch<Project[]>("/v1/projects");
}

export function fetchProject(id: string) {
  return apiFetch<Project>(`/v1/projects/${id}`);
}

export function fetchProjectPublications(projectId: string) {
  return apiFetch<Publication[]>(`/v1/projects/${projectId}/publications`);
}

export function fetchPublication(id: string) {
  return apiFetch<Publication>(`/v1/publications/${id}`);
}
