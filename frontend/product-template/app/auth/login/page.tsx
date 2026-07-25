"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { buildAuthorizationRequest } from "@/lib/oidc-pkce";

function resolveRedirectTarget(raw: string | null): string {
  if (!raw || raw.trim().length === 0) {
    return "/";
  }
  const value = raw.trim();
  if (value.startsWith("/")) {
    return value;
  }
  try {
    const parsed = new URL(value);
    if (typeof window !== "undefined" && parsed.origin === window.location.origin) {
      return parsed.pathname + parsed.search + parsed.hash;
    }
  } catch {
    return "/";
  }
  return "/";
}

export default function ProductOidcLoginPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    async function startLogin() {
      const authUrl = process.env.NEXT_PUBLIC_KEYCLOAK_AUTH_URL ?? "http://localhost:8081/realms/ametis/protocol/openid-connect/auth";
      const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? "core-api";
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      const redirectUri = `${appUrl}/auth/callback`;
      const redirectTarget = resolveRedirectTarget(searchParams.get("redirect"));

      const authorizationUrl = await buildAuthorizationRequest({
        authUrl,
        clientId,
        redirectUri,
        redirectTarget
      });
      window.location.assign(authorizationUrl);
    }

    startLogin();
  }, [searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="panel rounded-2xl px-6 py-5 text-sm text-slate-300">Redirecting to secure sign-in...</div>
    </main>
  );
}
