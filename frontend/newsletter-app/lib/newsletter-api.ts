import { getActiveTenantId, getAuthToken, setActiveTenantId } from "@/lib/session";

const NEWSLETTER_API_BASE_URL = process.env.NEXT_PUBLIC_NEWSLETTER_API_BASE_URL ?? "http://localhost:8082";

type OnboardingStatusResponse = {
  activeTenantId: string | null;
  tenants: Array<{ id: string }>;
};

export class NewsletterApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "NewsletterApiError";
    this.status = status;
  }
}

export type Source = {
  id: string;
  tenantId: string;
  projectId: string | null;
  name: string;
  type: "RSS" | "API" | "URL";
  url: string;
  category?: string | null;
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
  tone: string | null;
  audience?: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  createdAt: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
};

export type CreateProjectPayload = {
  name: string;
  description?: string;
  language: string;
  tone?: string;
  audience?: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
};

export type UpdateProjectPayload = CreateProjectPayload;

export type ProjectFormOptions = {
  tones: string[];
  audiences: string[];
};

export type CreateSourcePayload = {
  name: string;
  type: "RSS" | "API" | "URL";
  url: string;
  category?: string;
  active?: boolean;
};

export type Publication = {
  id: string;
  tenantId: string;
  projectId: string;
  title: string;
  slug: string | null;
  summary: string | null;
  content: string | null;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED";
  visibility: "PRIVATE" | "UNLISTED" | "PUBLIC";
  scheduledAt: string | null;
  publishedAt: string | null;
  createdFromDraftId: string | null;
  createdAt: string;
};

export type GenerationRequestStatus = "REQUESTED" | "RUNNING" | "COMPLETED" | "FAILED";

export type AgentGenerationDraft = {
  id: string;
  tenantId: string;
  projectId: string;
  generationRequestId: string | null;
  proposedTopic: string | null;
  generatedTitle: string | null;
  generatedSummary: string | null;
  generatedContent: string | null;
  status: "GENERATED" | "APPROVED" | "REJECTED" | "SCHEDULED" | "PUBLISHED";
  generationSource: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentGeneration = {
  id: string;
  tenantId: string;
  projectId: string;
  status: GenerationRequestStatus;
  externalExecutionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentGenerationDetail = {
  id: string;
  tenantId: string;
  projectId: string;
  titleHint: string | null;
  topicHint: string | null;
  roleProfile: string;
  writingStyle: string;
  audience: string;
  language: string;
  length: string;
  structureType: string;
  callToAction: string | null;
  creativityLevel: string;
  useReferences: boolean;
  includeSummary: boolean;
  includeConclusions: boolean;
  includeTags: boolean;
  maxSources: number | null;
  status: GenerationRequestStatus;
  createdBy: string | null;
  externalExecutionId: string | null;
  sourceIds: string[];
  draft: AgentGenerationDraft | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateAgentGenerationPayload = {
  sourceIds: string[];
  useAllActiveSources: boolean;
  titleHint?: string;
  topicHint?: string;
  roleProfile?: string;
  writingStyle?: string;
  audience?: string;
  language?: string;
  length?: string;
  structureType?: string;
  callToAction?: string;
  creativityLevel?: string;
  useReferences?: boolean;
  includeSummary?: boolean;
  includeConclusions?: boolean;
  includeTags?: boolean;
  maxSources?: number;
};

function normalizeErrorMessage(raw: string, status: number): string {
  if (!raw) return `Request failed with status ${status}`;
  try {
    const parsed = JSON.parse(raw) as { message?: string };
    return parsed.message || raw;
  } catch {
    return raw;
  }
}

async function resolveAndPersistActiveTenantId(token: string): Promise<string | null> {
  try {
    const response = await fetch(`${NEWSLETTER_API_BASE_URL}/api/newsletter/onboarding/status`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as OnboardingStatusResponse;
    const resolvedTenantId = payload.activeTenantId || payload.tenants[0]?.id || null;
    if (resolvedTenantId) {
      setActiveTenantId(resolvedTenantId);
    }
    return resolvedTenantId;
  } catch {
    return null;
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}, requireAuth = true): Promise<T> {
  const token = getAuthToken();
  let tenantId = getActiveTenantId();
  if (requireAuth && !token) {
    throw new NewsletterApiError(401, "Request failed with status 401");
  }
  if (requireAuth && token && !tenantId) {
    tenantId = await resolveAndPersistActiveTenantId(token);
  }

  const response = await fetch(`${NEWSLETTER_API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(requireAuth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId ? { "X-Tenant-Id": tenantId } : {}),
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new NewsletterApiError(response.status, normalizeErrorMessage(message, response.status));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function fetchSources() {
  return apiFetch<Source[]>("/api/newsletter/sources");
}

export function fetchSourcesIncludingDeleted() {
  return apiFetch<Source[]>("/api/newsletter/sources?includeDeleted=true");
}

export function fetchProjects() {
  return apiFetch<Project[]>("/api/newsletter/projects");
}

export function fetchProjectsIncludingDeleted() {
  return apiFetch<Project[]>("/api/newsletter/projects?includeDeleted=true");
}

export function createProject(payload: CreateProjectPayload) {
  return apiFetch<Project>("/api/newsletter/projects", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateProject(id: string, payload: UpdateProjectPayload) {
  return apiFetch<Project>(`/api/newsletter/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteProject(id: string) {
  return apiFetch<void>(`/api/newsletter/projects/${id}/delete`, {
    method: "POST"
  });
}

export function restoreProject(id: string) {
  return apiFetch<Project>(`/api/newsletter/projects/${id}/restore`, {
    method: "POST"
  });
}

export function fetchProjectFormOptions() {
  return apiFetch<ProjectFormOptions>("/api/newsletter/projects/options");
}

export function fetchProject(id: string) {
  return apiFetch<Project>(`/api/newsletter/projects/${id}`);
}

export function fetchProjectSources(projectId: string) {
  return apiFetch<Source[]>(`/api/newsletter/projects/${projectId}/sources`);
}

export function createProjectSource(projectId: string, payload: CreateSourcePayload) {
  return apiFetch<Source>(`/api/newsletter/projects/${projectId}/sources`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateSource(id: string, payload: CreateSourcePayload) {
  return apiFetch<Source>(`/api/newsletter/sources/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteSource(id: string) {
  return apiFetch<void>(`/api/newsletter/sources/${id}`, {
    method: "DELETE"
  });
}

export function restoreSource(id: string) {
  return apiFetch<Source>(`/api/newsletter/sources/${id}/restore`, {
    method: "POST"
  });
}

export function fetchProjectPublications(projectId: string) {
  return apiFetch<Publication[]>(`/api/newsletter/projects/${projectId}/publications`);
}

export function fetchPublication(id: string) {
  return apiFetch<Publication>(`/api/newsletter/publications/${id}`);
}

export function createAgentGeneration(projectId: string, payload: CreateAgentGenerationPayload) {
  return apiFetch<AgentGeneration>(`/api/newsletter/projects/${projectId}/agent/generations`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchAgentGeneration(id: string) {
  return apiFetch<AgentGenerationDetail>(`/api/newsletter/agent/generations/${id}`);
}

export function fetchViewerProjectPublications(projectId: string) {
  return apiFetch<Publication[]>(`/api/newsletter/viewer/projects/${projectId}/publications`, {}, false);
}

export function fetchViewerPublicationBySlug(slug: string) {
  return apiFetch<Publication>(`/api/newsletter/viewer/publications/${slug}`, {}, false);
}
