"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeAuthorizationCode, AuthClientError } from "@/lib/auth-client";
import { consumeState } from "@/lib/oidc-pkce";

type OnboardingStatus = {
  activeTenantId: string | null;
  tenants: Array<{ id: string }>;
};

async function resolveTenantForSession(accessToken: string): Promise<string | null> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_NEWSLETTER_API_BASE_URL ?? "http://localhost:8082";
  try {
    const response = await fetch(`${apiBaseUrl}/api/newsletter/onboarding/status`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as OnboardingStatus;
    if (payload.activeTenantId) {
      return payload.activeTenantId;
    }
    return payload.tenants[0]?.id ?? null;
  } catch {
    return null;
  }
}

export default function NewsletterOidcCallbackPage() {
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
        setMessage("La sesión de autenticación expiró. Inténtalo nuevamente.");
        return;
      }

      try {
        const appUrl = process.env.NEXT_PUBLIC_NEWSLETTER_WEB_URL ?? window.location.origin;
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
        sessionStorage.removeItem("active_tenant_id");
        localStorage.removeItem("active_tenant_id");

        const activeTenantId = await resolveTenantForSession(tokens.accessToken);
        if (activeTenantId) {
          localStorage.setItem("active_tenant_id", activeTenantId);
        }

        router.replace(stored.redirectTarget || "/");
      } catch (error) {
        if (error instanceof AuthClientError && error.status === 401) {
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
      <div className="panel rounded-2xl px-6 py-5 text-sm text-[#5a7092]">{message}</div>
    </main>
  );
}
