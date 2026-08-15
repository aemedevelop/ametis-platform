export type AuthTokenResponse = {
  accessToken: string;
  refreshToken: string | null;
  expiresIn?: number | null;
  tokenType?: string | null;
  refreshExpiresIn?: number | null;
};

const CORE_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

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

export async function refreshSession(refreshToken: string): Promise<AuthTokenResponse> {
  const response = await fetch(`${CORE_API_BASE_URL}/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      refreshToken,
      clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? "agent-factory-web"
    }),
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Refresh failed with status ${response.status}`);
  }
  return response.json() as Promise<AuthTokenResponse>;
}
