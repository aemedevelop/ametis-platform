export type AuthTokenResponse = {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  expiresIn: number | null;
  refreshExpiresIn: number | null;
  scope: string | null;
};

export class AuthClientError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "AuthClientError";
    this.status = status;
    this.code = code;
  }
}

const CORE_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function loginUser(payload: {
  username: string;
  password: string;
}): Promise<AuthTokenResponse> {
  const response = await fetch(`${CORE_API_BASE_URL}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  if (!response.ok) {
    const error = await parseApiError(response, `Login failed with status ${response.status}`);
    throw new AuthClientError(error.message, response.status, error.code);
  }

  return response.json() as Promise<AuthTokenResponse>;
}

export async function exchangeAuthorizationCode(payload: {
  code: string;
  redirectUri: string;
  codeVerifier?: string;
}): Promise<AuthTokenResponse> {
  const response = await fetch(`${CORE_API_BASE_URL}/v1/auth/code/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  if (!response.ok) {
    const error = await parseApiError(response, `Code exchange failed with status ${response.status}`);
    throw new AuthClientError(error.message, response.status, error.code);
  }

  return response.json() as Promise<AuthTokenResponse>;
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
      return { message: text };
    }
  } catch {
    // no-op
  }
  return { message: fallback };
}
