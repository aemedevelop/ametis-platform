"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeAuthorizationCode } from "@/lib/auth-client";
import { consumeState } from "@/lib/oidc-pkce";
import { useT } from "@/components/IntlProviderClient";

export default function CallbackPage() {
  return <Suspense fallback={<CallbackFallback />}><CallbackContent /></Suspense>;
}

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useT();
  const [messageKey, setMessageKey] = useState("auth.completing");

  useEffect(() => {
    async function finish() {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      if (!code || !state) {
        setMessageKey("auth.invalidResponse");
        return;
      }
      const stored = consumeState(state);
      if (!stored) {
        setMessageKey("auth.expired");
        return;
      }
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
        const tokens = await exchangeAuthorizationCode({
          clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? "agent-factory-web",
          code,
          redirectUri: `${appUrl}/auth/callback`,
          codeVerifier: stored.codeVerifier
        });
        window.localStorage.setItem("core_access_token", tokens.accessToken);
        if (tokens.refreshToken) window.localStorage.setItem("core_refresh_token", tokens.refreshToken);
        window.sessionStorage.removeItem("core_access_token");
        window.sessionStorage.removeItem("core_refresh_token");
        router.replace(stored.redirectTarget || "/");
      } catch {
        setMessageKey("auth.failed");
      }
    }
    finish();
  }, [router, searchParams]);

  return <main className="auth-screen"><div className="auth-card"><h1>{t("brand.product")}</h1><p>{t(messageKey)}</p></div></main>;
}

function CallbackFallback() {
  const t = useT();
  return <main className="auth-screen"><div className="auth-card"><h1>{t("brand.product")}</h1><p>{t("auth.completing")}</p></div></main>;
}
