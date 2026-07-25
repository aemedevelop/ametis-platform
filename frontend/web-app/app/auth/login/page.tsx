"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { resolveSafeRedirectTarget } from "@/lib/auth-redirect";
import { buildAuthorizationRequest } from "@/lib/oidc-pkce";

export default function OidcLoginPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    async function startLogin() {
      const authUrl = process.env.NEXT_PUBLIC_KEYCLOAK_AUTH_URL;
      const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      const redirectUri = `${appUrl}/auth/callback`;
      const redirectTarget = resolveSafeRedirectTarget(searchParams.get("redirect"));

      if (!authUrl || !clientId) {
        window.location.assign(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
        return;
      }

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
      <div className="panel rounded-2xl px-6 py-5 text-sm text-slate-300">Redirigiendo a inicio de sesión seguro...</div>
    </main>
  );
}
