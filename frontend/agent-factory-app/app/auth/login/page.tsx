"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
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
  const [redirectingIdp, setRedirectingIdp] = useState<string | null>(null);

  async function continueWithAmetis(idpHint?: string) {
    setError(null);
    if (idpHint) setRedirectingIdp(idpHint); else setIsRedirecting(true);

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      const target = searchParams.get("redirect") || "/";
      const url = await buildAuthorizationRequest({
        authUrl: process.env.NEXT_PUBLIC_KEYCLOAK_AUTH_URL ?? "http://localhost:8081/realms/ametis/protocol/openid-connect/auth",
        clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? "agent-factory-web",
        redirectUri: `${appUrl}/auth/callback`,
        redirectTarget: target.startsWith("/") ? target : "/",
        locale,
        idpHint
      });
      window.location.assign(url);
    } catch {
      setError(t("login.error"));
      setIsRedirecting(false);
      setRedirectingIdp(null);
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
              onClick={() => continueWithAmetis()}
              disabled={isRedirecting || !!redirectingIdp}
              aria-describedby="login-help"
            >
              <span className="brand-mark compact" aria-hidden="true">A</span>
              <span>{isRedirecting ? t("login.redirecting") : t("login.action")}</span>
              {isRedirecting ? <span className="login-spinner" aria-hidden="true" /> : <span className="button-arrow" aria-hidden="true">→</span>}
            </button>

            <div className="auth-divider"><span>{t("login.orDivider")}</span></div>

            <button
              className="ametis-login-button secondary"
              type="button"
              onClick={() => continueWithAmetis("google")}
              disabled={isRedirecting || !!redirectingIdp}
            >
              <span className="idp-mark google-mark" aria-hidden="true">
                <svg viewBox="0 0 48 48" width="20" height="20">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                </svg>
              </span>
              <span>{redirectingIdp === "google" ? t("login.redirecting") : t("login.googleAction")}</span>
              {redirectingIdp === "google" ? <span className="login-spinner dark" aria-hidden="true" /> : null}
            </button>

            <p className="auth-alt">
              {t("login.noAccount")}{" "}
              {process.env.NEXT_PUBLIC_REGISTRATION_ENABLED !== "false" ? (
                <Link href="/auth/register">{t("login.createAccount")}</Link>
              ) : (
                <span className="auth-alt-disabled" aria-disabled="true" title={t("auth.error.registrationDisabled")}>
                  {t("login.createAccount")}
                </span>
              )}
            </p>

            <div className="login-status" aria-live="polite">
              {isRedirecting || redirectingIdp ? <p>{t("login.redirectStatus")}</p> : null}
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
