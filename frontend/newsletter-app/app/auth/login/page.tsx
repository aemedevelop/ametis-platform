"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useT } from "@/components/IntlProviderClient";
import { buildAuthorizationRequest } from "@/lib/oidc-pkce";

export default function NewsletterLoginPage() {
  return <Suspense fallback={<LoginFallback />}><LoginRedirect /></Suspense>;
}

function LoginRedirect() {
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const t = useT();

  useEffect(() => {
    async function startLogin() {
      const appUrl = process.env.NEXT_PUBLIC_NEWSLETTER_WEB_URL ?? window.location.origin;
      const authorizationUrl = await buildAuthorizationRequest({
        authUrl: process.env.NEXT_PUBLIC_KEYCLOAK_AUTH_URL ?? "http://localhost:8081/realms/ametis/protocol/openid-connect/auth",
        clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? "newsletter-web",
        redirectUri: `${appUrl}/auth/callback`,
        redirectTarget: resolveRedirectTarget(searchParams.get("redirect")),
        locale
      });
      window.location.replace(authorizationUrl);
    }

    startLogin();
  }, [locale, searchParams]);

  return <AuthStatus message={t("auth.redirecting")} />;
}

function LoginFallback() {
  const t = useT();
  return <AuthStatus message={t("auth.preparing")} />;
}

function AuthStatus({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050A1A] p-6" role="status">
      <div className="panel rounded-2xl px-6 py-5 text-sm text-slate-300">{message}</div>
    </main>
  );
}

function resolveRedirectTarget(raw: string | null): string {
  if (!raw?.trim()) return "/";
  const value = raw.trim();
  if (value.startsWith("/") && !value.startsWith("/auth/")) return value;
  try {
    const parsed = new URL(value);
    if (parsed.origin === window.location.origin && !parsed.pathname.startsWith("/auth/")) {
      return parsed.pathname + parsed.search + parsed.hash;
    }
  } catch {
    return "/";
  }
  return "/";
}
