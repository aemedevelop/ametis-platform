"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { resolveSafeRedirectTarget } from "@/lib/auth-redirect";
import { buildAuthorizationRequest } from "@/lib/oidc-pkce";
import { useLocale, useT } from "@/components/IntlProviderClient";

export default function OidcLoginPage() {
  return <Suspense fallback={<LoginFallback />}><OidcLoginRedirect /></Suspense>;
}

function OidcLoginRedirect() {
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const t = useT();

  useEffect(() => {
    async function startLogin() {
      const authUrl = process.env.NEXT_PUBLIC_KEYCLOAK_AUTH_URL ?? "http://localhost:8081/realms/ametis/protocol/openid-connect/auth";
      const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? "ametis-hub-web";
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      const redirectUri = `${appUrl}/auth/callback`;
      const redirectTarget = resolveSafeRedirectTarget(searchParams.get("redirect"));

      const authorizationUrl = await buildAuthorizationRequest({
        authUrl,
        clientId,
        redirectUri,
        redirectTarget,
        locale
      });
      window.location.assign(authorizationUrl);
    }

    startLogin();
  }, [locale, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="panel rounded-2xl px-6 py-5 text-sm text-slate-300">{t("auth.oidc.redirecting")}</div>
    </main>
  );
}

function LoginFallback() {
  const t = useT();
  return <main className="flex min-h-screen items-center justify-center p-6"><div className="panel rounded-2xl px-6 py-5 text-sm text-slate-300">{t("auth.oidc.preparing")}</div></main>;
}
