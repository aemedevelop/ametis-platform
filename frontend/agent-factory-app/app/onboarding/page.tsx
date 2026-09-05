"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/IntlProviderClient";
import {
  AgentFactoryApiError,
  createBusiness,
  fetchBusinesses
} from "@/lib/agent-factory-api";
import { getAuthToken, setActiveBusinessId } from "@/lib/session";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export default function OnboardingPage() {
  const t = useT();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [businessName, setBusinessName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const check = useCallback(async () => {
    if (!getAuthToken()) {
      router.replace("/auth/login?redirect=/onboarding");
      return;
    }
    try {
      const businesses = await fetchBusinesses();
      if (businesses.length) {
        setActiveBusinessId(businesses[0].id);
        router.replace("/");
        return;
      }
    } catch (requestError) {
      // Sin workspace todavía o error transitorio: se muestra el formulario igualmente.
      if (requestError instanceof AgentFactoryApiError && requestError.status === 401) {
        router.replace("/auth/login?redirect=/onboarding");
        return;
      }
    }
    setChecking(false);
  }, [router]);

  useEffect(() => {
    check();
  }, [check]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!businessName.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const business = await createBusiness({ name: businessName.trim() });
      setActiveBusinessId(business.id);
      router.replace("/");
    } catch (requestError) {
      setError(requestError);
      setSubmitting(false);
    }
  }

  if (checking) {
    return <main className="auth-screen"><div className="auth-card" role="status"><span className="spinner" aria-hidden="true" />{t("onboarding.checking")}</div></main>;
  }

  return (
    <main className="auth-screen agent-login">
      <section className="login-layout" aria-labelledby="onboarding-title">
        <div className="login-story">
          <div className="login-brand" aria-label={t("login.ariaLabel")}>
            <span className="brand-mark" aria-hidden="true">A</span>
            <span><strong>{t("brand.company")}</strong><small>{t("brand.product")}</small></span>
          </div>
          <div className="login-story-content">
            <span className="login-kicker">{t("onboarding.kicker")}</span>
            <h1 id="onboarding-title">{t("onboarding.title")}</h1>
            <p>{t("onboarding.description")}</p>
          </div>
          <ul className="login-features">
            <li><span aria-hidden="true">1</span><p>{t("onboarding.step1")}</p></li>
            <li><span aria-hidden="true">2</span><p>{t("onboarding.step2")}</p></li>
            <li><span aria-hidden="true">3</span><p>{t("onboarding.step3")}</p></li>
          </ul>
        </div>

        <div className="login-panel">
          <div className="login-card">
            <h2>{t("onboarding.panelTitle")}</h2>
            <p id="onboarding-help">{t("onboarding.help")}</p>
            <form className="auth-form" onSubmit={submit} noValidate>
              <label className="form-field">
                <span className="field-label">{t("onboarding.businessNameLabel")} <span className="req" aria-hidden="true">*</span></span>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder={t("onboarding.businessNamePlaceholder")}
                  maxLength={120}
                  required
                  aria-required="true"
                  autoFocus
                />
              </label>
              {error ? <p className="login-error" role="alert">{messageOf(error, t)}</p> : null}
              <button className="ametis-login-button" type="submit" disabled={!businessName.trim() || submitting}>
                <span>{submitting ? t("onboarding.creating") : t("onboarding.action")}</span>
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

function messageOf(error: unknown, t: Translate): string {
  if (error instanceof AgentFactoryApiError) return t(error.code, error.variables);
  return t("common.unexpectedError");
}
