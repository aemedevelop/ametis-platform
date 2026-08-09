"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { buildAuthorizationRequest } from "@/lib/oidc-pkce";
import { useLocale, useT } from "@/components/IntlProviderClient";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";

export default function LoginPage() {
  return <Suspense fallback={<AuthFallback />}><LoginContent /></Suspense>;
}

function LoginContent() {
  const searchParams = useSearchParams();
  const t = useT();
  const { locale } = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  async function continueWithAmetis() {
    setError(null);
    setIsRedirecting(true);

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      const target = searchParams.get("redirect") || "/";
      const url = await buildAuthorizationRequest({
        authUrl: process.env.NEXT_PUBLIC_KEYCLOAK_AUTH_URL ?? "http://localhost:8081/realms/ametis/protocol/openid-connect/auth",
        clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? "agent-factory-web",
        redirectUri: `${appUrl}/auth/callback`,
        redirectTarget: target.startsWith("/") ? target : "/",
        locale
      });
      window.location.assign(url);
    } catch {
      setError(t("login.error"));
      setIsRedirecting(false);
    }
  }

  return (
    <main className="auth-screen agent-login">
      <section className="login-layout" aria-labelledby="login-title">
        <div className="login-story">
          <div className="login-brand" aria-label={t("login.ariaLabel")}>
            <span className="brand-mark" aria-hidden="true">A</span>
            <span><strong>{t("brand.company")}</strong><small>{t("brand.product")}</small></span>
          </div>

          <div className="login-story-content">
            <span className="login-kicker">{t("login.kicker")}</span>
            <h1 id="login-title">{t("login.title")}</h1>
            <p>{t("login.description")}</p>
          </div>

          <ul className="login-features" aria-label={t("login.featuresLabel")}>
            <li><span aria-hidden="true">✓</span><p><strong>{t("login.feature.repository.title")}</strong>{t("login.feature.repository.description")}</p></li>
            <li><span aria-hidden="true">✓</span><p><strong>{t("login.feature.access.title")}</strong>{t("login.feature.access.description")}</p></li>
            <li><span aria-hidden="true">✓</span><p><strong>{t("login.feature.future.title")}</strong>{t("login.feature.future.description")}</p></li>
          </ul>
        </div>

        <div className="login-panel">
          <div className="login-preferences"><LanguageSwitcher /><ThemeSwitcher /></div>
          <div className="login-card">
            <span className="secure-pill"><i aria-hidden="true" /> {t("login.secureAccess")}</span>
            <h2>{t("login.panelTitle")}</h2>
            <p id="login-help">{t("login.help")}</p>

            <button
              className="ametis-login-button"
              type="button"
              onClick={continueWithAmetis}
              disabled={isRedirecting}
              aria-describedby="login-help"
            >
              <span className="brand-mark compact" aria-hidden="true">A</span>
              <span>{isRedirecting ? t("login.redirecting") : t("login.action")}</span>
              {isRedirecting ? <span className="login-spinner" aria-hidden="true" /> : <span className="button-arrow" aria-hidden="true">→</span>}
            </button>

            <div className="login-status" aria-live="polite">
              {isRedirecting ? <p>{t("login.redirectStatus")}</p> : null}
              {error ? <p className="login-error" role="alert">{error}</p> : null}
            </div>

            <div className="login-security">
              <span className="security-icon" aria-hidden="true">✓</span>
              <p><strong>{t("login.securityTitle")}</strong>{t("login.securityDescription")}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function AuthFallback() {
  const t = useT();
  return (
    <main className="auth-screen">
      <div className="auth-card" role="status" aria-live="polite">
        <span className="brand-mark large" aria-hidden="true">A</span>
        <h1>{t("brand.product")}</h1>
        <p>{t("auth.preparing")}</p>
      </div>
    </main>
  );
}
