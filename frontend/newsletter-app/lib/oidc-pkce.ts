const PKCE_STATE_PREFIX = "oidc_pkce_state:";
const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

export type OidcStatePayload = {
  redirectTarget: string;
  codeVerifier: string;
  createdAt: number;
};

export async function buildAuthorizationRequest(params: {
  authUrl: string;
  clientId: string;
  redirectUri: string;
  redirectTarget: string;
  locale?: string;
}): Promise<string> {
  const state = randomString(48);
  const codeVerifier = randomString(96);
  const codeChallenge = await buildCodeChallenge(codeVerifier);
  const nonce = randomString(32);

  persistState(state, {
    redirectTarget: params.redirectTarget,
    codeVerifier,
    createdAt: Date.now()
  });

  const url = new URL(params.authUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (params.locale) url.searchParams.set("ui_locales", params.locale);
  return url.toString();
}

export function consumeState(state: string): OidcStatePayload | null {
  if (typeof window === "undefined") return null;
  const key = `${PKCE_STATE_PREFIX}${state}`;
  const raw = window.sessionStorage.getItem(key);
  window.sessionStorage.removeItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as OidcStatePayload;
    if (!parsed.redirectTarget || !parsed.codeVerifier) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function persistState(state: string, payload: OidcStatePayload) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(`${PKCE_STATE_PREFIX}${state}`, JSON.stringify(payload));
}

async function buildCodeChallenge(codeVerifier: string): Promise<string> {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

function randomString(length: number): string {
  const random = new Uint8Array(length);
  window.crypto.getRandomValues(random);
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += CHARSET[random[i] % CHARSET.length];
  }
  return result;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
