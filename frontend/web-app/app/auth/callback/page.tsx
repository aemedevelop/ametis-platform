"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeAuthorizationCode, ApiError } from "@/lib/api";
import { consumeState } from "@/lib/oidc-pkce";

export default function OidcCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState("Procesando autenticación...");

  useEffect(() => {
    async function finishLogin() {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const oauthError = searchParams.get("error");
      const oauthErrorDescription = searchParams.get("error_description");

      if (oauthError) {
        setMessage(oauthErrorDescription || "No se pudo completar el inicio de sesión.");
        return;
      }
      if (!code || !state) {
        setMessage("Respuesta de autenticación inválida.");
        return;
      }

      const stored = consumeState(state);
      if (!stored) {
        setMessage("La sesión de autenticación expiró. Intenta nuevamente.");
        return;
      }

      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
        const redirectUri = `${appUrl}/auth/callback`;
        const tokens = await exchangeAuthorizationCode({
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
          setMessage("No autorizado. Verifica el acceso de tu cuenta.");
        } else {
          setMessage("No se pudo completar la autenticación.");
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
