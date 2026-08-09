"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeAuthorizationCode, AuthClientError } from "@/lib/auth-client";
import { consumeState } from "@/lib/oidc-pkce";

export default function ProductOidcCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState("Processing authentication...");

  useEffect(() => {
    async function finishLogin() {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const oauthError = searchParams.get("error");
      const oauthErrorDescription = searchParams.get("error_description");

      if (oauthError) {
        setMessage(oauthErrorDescription || "Sign-in could not be completed.");
        return;
      }
      if (!code || !state) {
        setMessage("Invalid authentication response.");
        return;
      }

      const stored = consumeState(state);
      if (!stored) {
        setMessage("Authentication session expired. Please try again.");
        return;
      }

      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
        const redirectUri = `${appUrl}/auth/callback`;
        const tokens = await exchangeAuthorizationCode({
          clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? "replace-with-product-client-id",
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

        router.replace(stored.redirectTarget || "/");
      } catch (error) {
        if (error instanceof AuthClientError && error.status === 401) {
          setMessage("Unauthorized. Verify your account access.");
        } else {
          setMessage("Authentication could not be completed.");
        }
      }
    }

    finishLogin();
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="panel rounded-2xl px-6 py-5 text-sm text-slate-300">{message}</div>
    </main>
  );
}
