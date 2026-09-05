import { getAuthMode } from "@/lib/session";

export type AuthTokenResponse = {
  accessToken: string;
  refreshToken: string | null;
  expiresIn?: number | null;
  tokenType?: string | null;
  refreshExpiresIn?: number | null;
};

export type RegisterAccountPayload = {
  email: string;
  password: string;
  fullName: string;
};

export class AuthClientError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
    this.name = "AuthClientError";
  }
}

const CORE_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

function codeForStatus(status: number, fallback: string): string {
  if (status === 401) return "auth.error.invalidCredentials";
  if (status === 409) return "auth.error.emailTaken";
  if (status === 400) return "auth.error.invalidData";
  if (status === 502 || status === 503) return "auth.error.identityUnavailable";
  return fallback;
}

export async function exchangeAuthorizationCode(payload: {
  clientId: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<AuthTokenResponse> {
  const response = await fetch(`${CORE_API_BASE_URL}/v1/auth/code/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Authentication failed with status ${response.status}`);
  }
  return response.json() as Promise<AuthTokenResponse>;
}

export async function registerAccount(payload: RegisterAccountPayload): Promise<void> {
  const response = await fetch(`${CORE_API_BASE_URL}/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  if (!response.ok) {
    throw new AuthClientError(response.status, codeForStatus(response.status, "auth.error.registerFailed"));
  }
}

export async function loginWithPassword(username: string, password: string): Promise<AuthTokenResponse> {
  const response = await fetch(`${CORE_API_BASE_URL}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store"
  });
  if (!response.ok) {
    throw new AuthClientError(response.status, codeForStatus(response.status, "auth.error.loginFailed"));
  }
  return response.json() as Promise<AuthTokenResponse>;
}

export async function refreshSession(refreshToken: string): Promise<AuthTokenResponse> {
  // Las sesiones por contraseña se emiten para el cliente confidencial de Core
  // (lado servidor); no se debe enviar clientId. Las sesiones SSO se emiten para
  // el cliente público 'agent-factory-web' y deben refrescarse con ese clientId.
  const body: Record<string, string> = { refreshToken };
  if (getAuthMode() === "sso") {
    body.clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? "agent-factory-web";
  }
  const response = await fetch(`${CORE_API_BASE_URL}/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Refresh failed with status ${response.status}`);
  }
  return response.json() as Promise<AuthTokenResponse>;
}
