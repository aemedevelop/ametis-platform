import { refreshSession } from "@/lib/auth-client";
import {
  clearActiveBusinessId,
  clearSession,
  getActiveBusinessId,
  getActiveTenantId,
  getAuthToken,
  getRefreshToken,
  isAuthTokenExpired,
  setActiveBusinessId,
  setActiveTenantId,
  storeSessionTokens
} from "@/lib/session";

const API_BASE_URL = process.env.NEXT_PUBLIC_AGENT_FACTORY_API_BASE_URL ?? "http://localhost:8000";
const CORE_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type RepositoryStatus = {
  provider: string;
  repositoryNamespace: string;
  repositoryAlias: string;
  repositoryTechnicalId: string;
  status: "PROVISIONING" | "ACTIVE" | "ERROR";
  lastError: string | null;
  updatedAt: string;
};

export type DriveConnection = {
  status: "CONNECTED" | "MANAGED" | "NOT_CONNECTED" | "NOT_CONFIGURED";
  accountEmail: string | null;
  connectedAt: string | null;
};

export type StoredDocument = {
  storageObjectKey: string;
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

export type BusinessStatus = "ACTIVE" | "ARCHIVED";

export type BusinessRepositoryStatus = "PENDING" | "ACTIVE" | "ERROR";

export type Business = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: BusinessStatus;
  repositoryStatus: BusinessRepositoryStatus;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeBase = {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "READY";
  repositoryStatus: BusinessRepositoryStatus;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AssistantTextKey = "fallback" | "greeting" | "thanks" | "farewell" | "help";
export type AssistantTexts = Partial<Record<AssistantTextKey, string>>;
export type SuggestedQuestionsOrder = "random" | "fixed";
export type QuestionTopic = { id: string; label: string; questions: string[] };

export type AgentDefinition = {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  persona: string | null;
  targetAudience: string | null;
  tone: string | null;
  responseLanguage: string | null;
  instructions: string | null;
  suggestedQuestions: string[];
  assistantTexts: AssistantTexts;
  suggestedQuestionsCount: number;
  suggestedQuestionsOrder: SuggestedQuestionsOrder;
  questionTopics: QuestionTopic[];
  status: "DRAFT" | "READY";
  knowledgeBaseCount: number;
  knowledgeBaseIds: string[];
  knowledgeBaseNames: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type AgentIndexingJob = {
  id: string;
  tenant_id: string;
  agent_id: string;
  knowledge_base_id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  requested_by: string | null;
  requested_at: string;
  started_at: string | null;
  finished_at: string | null;
  documents: number;
  chunks: number;
  error_message: string | null;
};

export type CreateIndexingJobsResponse = {
  status: string;
  tenant_id: string;
  agent_id: string;
  jobs: AgentIndexingJob[];
};

export type AgentTestResponse = {
  tenantId: string;
  question: string;
  answer: string;
  responseType: string;
  suggestions: string[];
};

export type DeploymentChannelType = "WEB_CHAT" | "API" | "INTERNAL_TEST";

export type DeploymentStatus = "ACTIVE" | "INACTIVE";

export type DeploymentFont = "system" | "serif" | "mono" | "humanist";
export type DeploymentPosition = "bottom-right" | "bottom-left";

export type DeploymentTheme = {
  primaryColor: string | null;
  font: DeploymentFont | null;
  position: DeploymentPosition | null;
  title: string | null;
  subtitle: string | null;
  avatarUrl: string | null;
};

export type AgentDeployment = {
  id: string;
  agentId: string;
  agentName: string;
  name: string;
  channelType: DeploymentChannelType;
  deploymentSlug: string;
  status: DeploymentStatus;
  publicId: string;
  endpointUrl: string;
  queryUrl: string;
  embedSnippet: string | null;
  hasApiKey: boolean;
  welcomeMessage: string | null;
  rateLimitPerMinute: number | null;
  rateLimitPerDay: number | null;
  allowedOrigins: string[];
  theme: DeploymentTheme | null;
  createdAt: string;
  updatedAt: string;
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

let activeRefreshRequest: Promise<string> | null = null;

async function resolveTenant(token: string): Promise<string> {
  const existing = getActiveTenantId();
  if (existing) return existing;
  const response = await fetch(`${CORE_API_BASE_URL}/v1/tenants`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  if (response.status === 401) throw new AgentFactoryApiError(401, "error.sessionExpired");
  if (!response.ok) throw new AgentFactoryApiError(response.status, "error.workspaceResolve");
  const tenants = (await response.json()) as Array<{ id: string }>;
  if (!tenants[0]) throw new AgentFactoryApiError(404, "error.workspaceMissing");
  setActiveTenantId(tenants[0].id);
  return tenants[0].id;
}

async function resolveBusiness(token: string, tenantId: string): Promise<string> {
  const existing = getActiveBusinessId();
  if (existing) return existing;
  const response = await fetch(`${API_BASE_URL}/api/agent-factory/businesses`, {
    headers: { Authorization: `Bearer ${token}`, "X-Tenant-Id": tenantId },
    cache: "no-store"
  });
  if (response.status === 401) throw new AgentFactoryApiError(401, "error.sessionExpired");
  if (!response.ok) throw new AgentFactoryApiError(response.status, "error.operationFailed");
  const businesses = (await response.json()) as Array<{ id: string }>;
  if (!businesses[0]) throw new AgentFactoryApiError(404, "error.businessMissing");
  setActiveBusinessId(businesses[0].id);
  return businesses[0].id;
}

function needsBusinessContext(path: string): boolean {
  return !path.startsWith("/api/agent-factory/businesses") && !path.startsWith("/v1/businesses");
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await authenticatedFetch(path, options);
  return response.json() as Promise<T>;
}

function redirectToOnboarding(): never {
  if (typeof window !== "undefined" && window.location.pathname !== "/onboarding") {
    window.location.assign("/onboarding");
  }
  throw new AgentFactoryApiError(404, "error.onboardingRequired");
}

async function authenticatedFetch(path: string, options: RequestInit = {}): Promise<Response> {
  let response: Response;
  try {
    response = await fetchWithToken(path, options, await getValidAuthToken());
  } catch (error) {
    if (error instanceof AgentFactoryApiError
      && (error.code === "error.workspaceMissing" || error.code === "error.businessMissing")) {
      redirectToOnboarding();
    }
    if (!(error instanceof AgentFactoryApiError) || error.status !== 401) throw error;
    response = await fetchWithToken(path, options, await refreshAccessToken());
  }
  if (response.status === 401) {
    response = await fetchWithToken(path, options, await refreshAccessToken());
  }
  if (!response.ok) {
    const payload = await response.clone().json().catch(() => null) as { message?: unknown } | null;
    const responseCode = typeof payload?.message === "string" && payload.message.startsWith("error.")
      ? payload.message
      : "error.operationFailed";
    // El negocio activo guardado ya no existe (borrado en otra pestaña / sesión).
    // Se limpia y se recarga para re-resolver a uno válido.
    if (responseCode === "error.businessNotFound" && getActiveBusinessId()) {
      clearActiveBusinessId();
      if (typeof window !== "undefined") window.location.reload();
    }
    throw new AgentFactoryApiError(response.status, responseCode, { status: response.status });
  }
  return response;
}

async function fetchWithToken(path: string, options: RequestInit, token: string): Promise<Response> {
  const tenantId = await resolveTenant(token);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "X-Tenant-Id": tenantId,
    ...(options.headers as Record<string, string> | undefined ?? {})
  };
  if (needsBusinessContext(path)) {
    headers["X-Business-Id"] = await resolveBusiness(token, tenantId);
  }
  return fetch(`${API_BASE_URL}${path}`, { ...options, headers, cache: "no-store" });
}

function expireSession(): never {
  clearSession();
  window.location.replace(`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`);
  throw new AgentFactoryApiError(401, "error.sessionExpired");
}

async function getValidAuthToken(): Promise<string> {
  const token = getAuthToken();
  if (!token) throw new AgentFactoryApiError(401, "error.sessionExpired");
  if (!isAuthTokenExpired(token, 45)) return token;
  return refreshAccessToken();
}

async function refreshAccessToken(): Promise<string> {
  if (!activeRefreshRequest) {
    activeRefreshRequest = doRefreshAccessToken().finally(() => {
      activeRefreshRequest = null;
    });
  }
  return activeRefreshRequest;
}

async function doRefreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) expireSession();
  try {
    const tokens = await refreshSession(refreshToken);
    storeSessionTokens(tokens);
    return tokens.accessToken;
  } catch {
    expireSession();
  }
}

export function fetchRepository() {
  return apiFetch<RepositoryStatus>("/api/agent-factory/repository");
}

export function fetchBusinesses() {
  return apiFetch<Business[]>("/api/agent-factory/businesses");
}

export function createBusiness(input: { name: string; description?: string }) {
  return apiFetch<Business>("/api/agent-factory/businesses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
}

export function updateBusiness(id: string, input: { name: string; description?: string; status?: BusinessStatus }) {
  return apiFetch<Business>(`/api/agent-factory/businesses/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
}

export async function deleteBusiness(id: string, confirmationName: string): Promise<void> {
  await authenticatedFetch(`/api/agent-factory/businesses/${id}/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmationName })
  });
}

export function fetchDriveConnection() {
  return apiFetch<DriveConnection>("/api/agent-factory/drive/connection");
}

export function startDriveConnection() {
  return apiFetch<{ authorizationUrl: string }>("/api/agent-factory/drive/connection/authorize", { method: "POST" });
}

export function provisionRepository(repositoryNamespace?: string) {
  return apiFetch<RepositoryStatus>("/api/agent-factory/repository/provision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repositoryNamespace: repositoryNamespace || null })
  });
}

export function updateRepositoryNamespace(repositoryNamespace: string) {
  return apiFetch<RepositoryStatus>("/api/agent-factory/repository/namespace", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repositoryNamespace })
  });
}

export function fetchKnowledgeBases() {
  return apiFetch<KnowledgeBase[]>("/api/agent-factory/knowledge-bases");
}

export function createKnowledgeBase(input: { name: string; description: string }) {
  return apiFetch<KnowledgeBase>("/api/agent-factory/knowledge-bases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
}

export function updateKnowledgeBase(id: string, input: { name: string; description: string }) {
  return apiFetch<KnowledgeBase>(`/api/agent-factory/knowledge-bases/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
}

export async function deleteKnowledgeBase(id: string): Promise<void> {
  await authenticatedFetch(`/api/agent-factory/knowledge-bases/${id}`, { method: "DELETE" });
}

export function fetchKnowledgeBaseDocuments(knowledgeBaseId: string) {
  return apiFetch<StoredDocument[]>(`/api/agent-factory/knowledge-bases/${knowledgeBaseId}/documents`);
}

export function uploadKnowledgeBaseDocument(knowledgeBaseId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<StoredDocument>(`/api/agent-factory/knowledge-bases/${knowledgeBaseId}/documents`, {
    method: "POST",
    body: form
  }).catch((error: unknown) => {
    if (error instanceof AgentFactoryApiError && error.status === 415) {
      throw new AgentFactoryApiError(415, "error.unsupportedFileType", { name: file.name });
    }
    throw error;
  });
}

export async function deleteKnowledgeBaseDocument(knowledgeBaseId: string, storageObjectKey: string): Promise<void> {
  await authenticatedFetch(`/api/agent-factory/knowledge-bases/${knowledgeBaseId}/documents/${storageObjectKey}`, {
    method: "DELETE"
  });
}

export async function downloadKnowledgeBaseDocument(
  knowledgeBaseId: string,
  document: StoredDocument
): Promise<void> {
  const response = await authenticatedFetch(
    `/api/agent-factory/knowledge-bases/${knowledgeBaseId}/documents/${document.storageObjectKey}/download`
  );
  if (!response.ok) throw new AgentFactoryApiError(response.status, "error.downloadFailed");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = document.name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function fetchAgents() {
  return apiFetch<AgentDefinition[]>("/api/agent-factory/agents");
}

export type AgentInput = {
  name: string;
  description: string;
  persona: string;
  targetAudience: string;
  tone: string;
  responseLanguage: string;
  instructions: string;
  suggestedQuestions: string[];
  assistantTexts: AssistantTexts;
  suggestedQuestionsCount: number;
  suggestedQuestionsOrder: SuggestedQuestionsOrder;
  questionTopics: QuestionTopic[];
  knowledgeBaseIds: string[];
};

export function createAgent(input: AgentInput) {
  return apiFetch<AgentDefinition>("/api/agent-factory/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
}

export function updateAgent(id: string, input: AgentInput) {
  return apiFetch<AgentDefinition>(`/api/agent-factory/agents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
}

export async function deleteAgent(id: string): Promise<void> {
  await authenticatedFetch(`/api/agent-factory/agents/${id}`, { method: "DELETE" });
}

export function publishAgent(id: string) {
  return apiFetch<AgentDefinition>(`/api/agent-factory/agents/${id}/publish`, { method: "POST" });
}

export function createAgentIndexingJobs(id: string) {
  return apiFetch<CreateIndexingJobsResponse>(`/api/agent-factory/agents/${id}/indexing-jobs`, { method: "POST" });
}

export function fetchAgentIndexingJobs(id: string) {
  return apiFetch<AgentIndexingJob[]>(`/api/agent-factory/agents/${id}/indexing-jobs/latest`);
}

export function testAgent(id: string, question: string) {
  return apiFetch<AgentTestResponse>(`/api/agent-factory/agents/${id}/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question })
  });
}

export function fetchDeployments() {
  return apiFetch<AgentDeployment[]>("/api/agent-factory/deployments");
}

/**
 * Despliegue de prueba fijo del workspace (uno por tenant); se autocrea la
 * primera vez que se pide. Si se pasa `agentId`, se reapunta a ese agente.
 */
export function fetchWorkspaceTestDeployment(agentId?: string) {
  const query = agentId ? `?agentId=${encodeURIComponent(agentId)}` : "";
  return apiFetch<AgentDeployment>(`/api/agent-factory/deployments/workspace-test${query}`);
}

export function createDeployment(input: {
  agentId: string;
  name: string;
  channelType: DeploymentChannelType;
  deploymentSlug: string;
  status?: DeploymentStatus;
  apiKey?: string;
  welcomeMessage?: string;
  rateLimitPerMinute?: number;
  rateLimitPerDay?: number;
  allowedOrigins?: string[];
}) {
  return apiFetch<AgentDeployment>("/api/agent-factory/deployments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
}

export function updateDeployment(id: string, input: {
  agentId: string;
  name: string;
  channelType: DeploymentChannelType;
  deploymentSlug: string;
  status: DeploymentStatus;
  apiKey?: string;
  welcomeMessage?: string;
  rateLimitPerMinute?: number;
  rateLimitPerDay?: number;
  allowedOrigins?: string[];
}) {
  return apiFetch<AgentDeployment>(`/api/agent-factory/deployments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
}

export function uploadDeploymentAvatar(id: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<AgentDeployment>(`/api/agent-factory/deployments/${id}/appearance/avatar`, {
    method: "POST",
    body: form
  });
}

export function deleteDeploymentAvatar(id: string) {
  return apiFetch<AgentDeployment>(`/api/agent-factory/deployments/${id}/appearance/avatar`, {
    method: "DELETE"
  });
}

export function regenerateDeploymentPublicId(id: string) {
  return apiFetch<AgentDeployment>(`/api/agent-factory/deployments/${id}/public-id`, { method: "POST" });
}

export function updateDeploymentAppearance(id: string, theme: {
  primaryColor?: string;
  font?: DeploymentFont;
  position?: DeploymentPosition;
  title?: string;
  subtitle?: string;
}) {
  return apiFetch<AgentDeployment>(`/api/agent-factory/deployments/${id}/appearance`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(theme)
  });
}

export async function deleteDeployment(id: string): Promise<void> {
  await authenticatedFetch(`/api/agent-factory/deployments/${id}`, { method: "DELETE" });
}

