import type { AuthorizationCheckResult, HealthResponse } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const DEFAULT_CHAT_API_URL = "/api/rag-chat";

export class ApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
};

export type RegisterResponse = {
  userId: string;
  subject: string;
  email: string;
  fullName: string;
};

export type LoginPayload = {
  username: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  expiresIn: number | null;
  refreshExpiresIn: number | null;
  scope: string | null;
};

export type RefreshPayload = {
  refreshToken: string;
};

export type AuthCodeExchangePayload = {
  clientId: string;
  code: string;
  redirectUri: string;
  codeVerifier?: string;
};

export type ProfileResponse = {
  userId: string;
  email: string;
  fullName: string;
};

export type ChatResponseType = "quick_reply" | "rag_answer" | "fallback";

export type ChatResponse = {
  tenant_id: string;
  question: string;
  answer: string;
  response_type: ChatResponseType;
  suggestions: string[];
};

export type ChatQuestionPayload = {
  tenant_id: string;
  question: string;
};

export type UpdateProfilePayload = {
  fullName: string;
};

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/health`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Health endpoint failed with status ${response.status}`);
  }
  return response.json() as Promise<HealthResponse>;
}

export async function checkAuthorization(token: string, tenantId: string, permissionCode: string): Promise<AuthorizationCheckResult> {
  const response = await fetch(`${API_BASE_URL}/v1/authorization/check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ tenantId, permissionCode }),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Authorization check failed with status ${response.status}`);
  }

  return response.json() as Promise<AuthorizationCheckResult>;
}

export async function registerUser(payload: RegisterPayload): Promise<RegisterResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  if (!response.ok) {
    const error = await parseApiError(response, `Register failed with status ${response.status}`);
    throw new ApiError(error.message, response.status, error.code);
  }

  return response.json() as Promise<RegisterResponse>;
}

export async function loginUser(payload: LoginPayload): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  if (!response.ok) {
    const error = await parseApiError(response, `Login failed with status ${response.status}`);
    throw new ApiError(error.message, response.status, error.code);
  }

  return response.json() as Promise<LoginResponse>;
}

export async function fetchProfile(): Promise<ProfileResponse> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/v1/profile`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const error = await parseApiError(response, `Profile fetch failed with status ${response.status}`);
    throw new ApiError(error.message, response.status, error.code);
  }

  return response.json() as Promise<ProfileResponse>;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<ProfileResponse> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/v1/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  if (!response.ok) {
    const error = await parseApiError(response, `Profile update failed with status ${response.status}`);
    throw new ApiError(error.message, response.status, error.code);
  }

  return response.json() as Promise<ProfileResponse>;
}

export async function refreshSession(): Promise<LoginResponse> {
  const refreshToken = getRefreshToken();
  const response = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store"
  });

  if (!response.ok) {
    const error = await parseApiError(response, `Refresh failed with status ${response.status}`);
    throw new ApiError(error.message, response.status, error.code);
  }

  return response.json() as Promise<LoginResponse>;
}

export async function exchangeAuthorizationCode(payload: AuthCodeExchangePayload): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/auth/code/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  if (!response.ok) {
    const error = await parseApiError(response, `Code exchange failed with status ${response.status}`);
    throw new ApiError(error.message, response.status, error.code);
  }

  return response.json() as Promise<LoginResponse>;
}

export async function askCopilot(payload: ChatQuestionPayload): Promise<ChatResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getOptionalAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(getChatApiUrl(), {
    method: "POST",
    headers,
    body: JSON.stringify(buildChatRequestBody(payload)),
    cache: "no-store"
  });

  if (!response.ok) {
    const error = await parseApiError(response, `Chat request failed with status ${response.status}`);
    throw new ApiError(error.message, response.status, error.code);
  }

  const body = (await response.json()) as unknown;
  return normalizeChatResponse(body, payload);
}

export function storeSessionTokens(tokens: LoginResponse) {
  if (typeof window === "undefined") return;
  const storage = getTokenStorage();
  const cleanupStorage = storage === localStorage ? sessionStorage : localStorage;
  cleanupStorage.removeItem("core_access_token");
  cleanupStorage.removeItem("core_refresh_token");
  storage.setItem("core_access_token", tokens.accessToken);
  if (tokens.refreshToken) {
    storage.setItem("core_refresh_token", tokens.refreshToken);
  }
}

export function clearSessionTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("core_access_token");
  localStorage.removeItem("core_refresh_token");
  sessionStorage.removeItem("core_access_token");
  sessionStorage.removeItem("core_refresh_token");
}

function getAuthToken(): string {
  if (typeof window === "undefined") {
    throw new ApiError("Not authenticated", 401, "authentication_error");
  }
  const token = getTokenStorage().getItem("core_access_token");
  if (!token) {
    throw new ApiError("Not authenticated", 401, "authentication_error");
  }
  return token;
}

function getOptionalAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("core_access_token") || sessionStorage.getItem("core_access_token");
}

function getRefreshToken(): string {
  if (typeof window === "undefined") {
    throw new ApiError("Not authenticated", 401, "authentication_error");
  }
  const token = getTokenStorage().getItem("core_refresh_token");
  if (!token) {
    throw new ApiError("Not authenticated", 401, "authentication_error");
  }
  return token;
}

function getTokenStorage(): Storage {
  if (typeof window === "undefined") {
    throw new ApiError("Not authenticated", 401, "authentication_error");
  }
  if (localStorage.getItem("core_access_token")) return localStorage;
  if (sessionStorage.getItem("core_access_token")) return sessionStorage;
  return localStorage;
}

function getChatApiUrl(): string {
  return process.env.NEXT_PUBLIC_CHAT_API_URL ?? DEFAULT_CHAT_API_URL;
}

function buildChatRequestBody(payload: ChatQuestionPayload): Record<string, string> {
  if (getChatApiUrl().includes("/tenants/") && getChatApiUrl().endsWith("/query")) {
    return { question: payload.question };
  }
  return payload;
}

function normalizeChatResponse(body: unknown, fallback: ChatQuestionPayload): ChatResponse {
  const value = unwrapChatResponse(body);
  const responseType = normalizeResponseType(value.response_type);

  return {
    tenant_id: toNonEmptyString(value.tenant_id) ?? fallback.tenant_id,
    question: toNonEmptyString(value.question) ?? fallback.question,
    answer: toNonEmptyString(value.answer) ?? "",
    response_type: responseType,
    suggestions: normalizeSuggestions(value.suggestions)
  };
}

function unwrapChatResponse(body: unknown): Record<string, unknown> {
  if (isRecord(body)) {
    if (isRecord(body.data)) return body.data;
    if (isRecord(body.response)) return body.response;
    return body;
  }
  return {};
}

function normalizeResponseType(value: unknown): ChatResponseType {
  if (value === "quick_reply" || value === "rag_answer" || value === "fallback") {
    return value;
  }
  return "fallback";
}

function normalizeSuggestions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(toNonEmptyString).filter((suggestion): suggestion is string => Boolean(suggestion));
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function parseApiError(response: Response, fallback: string): Promise<{ message: string; code?: string }> {
  try {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await response.json()) as { message?: string; code?: string };
      if (body.message && body.message.trim().length > 0) {
        return { message: body.message, code: body.code };
      }
      if (body.code && body.code.trim().length > 0) {
        return { message: body.code, code: body.code };
      }
    }
    const text = await response.text();
    if (text.trim().length > 0) {
      if (text.trimStart().toLowerCase().startsWith("<!doctype html") || text.trimStart().toLowerCase().startsWith("<html")) {
        return { message: fallback };
      }
      return { message: text };
    }
  } catch {
    // no-op
  }
  return { message: fallback };
}
