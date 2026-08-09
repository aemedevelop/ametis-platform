"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeAuthorizationCode, ApiError } from "@/lib/api";
import { consumeState } from "@/lib/oidc-pkce";
import { useT } from "@/components/IntlProviderClient";

export default function OidcCallbackPage() {
  return <Suspense fallback={<CallbackFallback />}><OidcCallbackContent /></Suspense>;
}

function OidcCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useT();
  const [messageKey, setMessageKey] = useState("auth.oidc.processing");

  useEffect(() => {
    async function finishLogin() {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const oauthError = searchParams.get("error");

      if (oauthError) {
        setMessageKey("auth.oidc.failed");
        return;
      }
      if (!code || !state) {
        setMessageKey("auth.oidc.invalid");
        return;
      }

      const stored = consumeState(state);
      if (!stored) {
        setMessageKey("auth.oidc.expired");
        return;
      }

      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
        const redirectUri = `${appUrl}/auth/callback`;
        const tokens = await exchangeAuthorizationCode({
          clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? "ametis-hub-web",
          code,
          redirectUri,
          codeVerifier: stored.codeVerifier
        });

        localStorage.setItem("core_access_token", tokens.accessToken);
        if (tokens.refreshToken) {
          localStorage.setItem("core_refresh_token", tokens.refreshToken);
        }
        sessionStorage.removeItem("core_access_token");
        sessionStorage.removeItem("core_refresh_token");

        if (stored.redirectTarget.startsWith("/")) {
          router.replace(stored.redirectTarget);
        } else {
          window.location.assign(stored.redirectTarget);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setMessageKey("auth.oidc.unauthorized");
        } else {
          setMessageKey("auth.oidc.failed");
        }
      }
    }

    finishLogin();
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="panel rounded-2xl px-6 py-5 text-sm text-slate-300">{t(messageKey)}</div>
    </main>
  );
}

function CallbackFallback() {
  const t = useT();
  return <main className="flex min-h-screen items-center justify-center p-6"><div className="panel rounded-2xl px-6 py-5 text-sm text-slate-300">{t("auth.oidc.processing")}</div></main>;
}
