const DEFAULT_AFTER_LOGIN_PATH = "/dashboard";

export function resolveSafeRedirectTarget(raw: string | null): string {
  if (!raw || raw.trim().length === 0) {
    return DEFAULT_AFTER_LOGIN_PATH;
  }

  const value = raw.trim();
  if (value.startsWith("/")) {
    return value;
  }

  if (typeof window === "undefined") {
    return DEFAULT_AFTER_LOGIN_PATH;
  }

  try {
    const parsed = new URL(value);
    if (!isAllowedRedirectOrigin(parsed.origin)) {
      return DEFAULT_AFTER_LOGIN_PATH;
    }
    return parsed.toString();
  } catch {
    return DEFAULT_AFTER_LOGIN_PATH;
  }
}

export function buildLoginHrefWithRedirect(redirectTarget: string): string {
  const encoded = encodeURIComponent(redirectTarget);
  return `/login?redirect=${encoded}`;
}

function isAllowedRedirectOrigin(origin: string): boolean {
  if (typeof window === "undefined") return false;
  const allowed = new Set<string>([
    window.location.origin,
    ...getLocalDevAllowedOrigins(window.location.origin),
    ...getConfiguredAllowedOrigins()
  ]);
  return allowed.has(origin);
}

function getConfiguredAllowedOrigins(): string[] {
  const raw = process.env.NEXT_PUBLIC_ALLOWED_REDIRECT_ORIGINS ?? "";
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      try {
        return new URL(item).origin;
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}

function getLocalDevAllowedOrigins(currentOrigin: string): string[] {
  try {
    const current = new URL(currentOrigin);
    const host = current.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") {
      return [];
    }

    const ports = ["3000", "3100", "3200"];
    return ports.map((port) => `${current.protocol}//${host}:${port}`);
  } catch {
    return [];
  }
}
