const PKCE_STATE_PREFIX = "agent_factory_oidc_state:";
const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

export type OidcStatePayload = {
  redirectTarget: string;
  codeVerifier: string;
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
  window.sessionStorage.setItem(
    `${PKCE_STATE_PREFIX}${state}`,
    JSON.stringify({ redirectTarget: params.redirectTarget, codeVerifier })
  );
  const url = new URL(params.authUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", randomString(32));
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (params.locale) url.searchParams.set("ui_locales", params.locale);
  return url.toString();
}

export function consumeState(state: string): OidcStatePayload | null {
  const key = `${PKCE_STATE_PREFIX}${state}`;
  const raw = window.sessionStorage.getItem(key);
  window.sessionStorage.removeItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OidcStatePayload;
  } catch {
    return null;
  }
}

function randomString(length: number): string {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => CHARSET[value % CHARSET.length]).join("");
}

async function buildCodeChallenge(codeVerifier: string): Promise<string> {
  const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
  const binary = Array.from(new Uint8Array(digest), (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
