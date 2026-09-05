"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthClientError, loginWithPassword, registerAccount } from "@/lib/auth-client";
import { setAuthMode, storeSessionTokens } from "@/lib/session";
import { useT } from "@/components/IntlProviderClient";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";

export default function RegisterPage() {
  const t = useT();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordTooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = firstName.trim() && lastName.trim() && email.trim()
    && password.length >= 8 && confirm === password && !submitting;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await registerAccount({
        email: email.trim(),
        password,
        fullName: `${firstName.trim()} ${lastName.trim()}`
      });
      const tokens = await loginWithPassword(email.trim(), password);
      storeSessionTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      setAuthMode("password");
      router.replace("/onboarding");
    } catch (requestError) {
      const code = requestError instanceof AuthClientError ? requestError.code : "auth.error.registerFailed";
      setError(t(code));
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-screen agent-login">
      <section className="login-layout" aria-labelledby="register-title">
        <div className="login-story">
          <div className="login-brand" aria-label={t("login.ariaLabel")}>
            <span className="brand-mark" aria-hidden="true">A</span>
            <span><strong>{t("brand.company")}</strong><small>{t("brand.product")}</small></span>
          </div>
          <div className="login-story-content">
            <span className="login-kicker">{t("register.kicker")}</span>
            <h1 id="register-title">{t("register.title")}</h1>
            <p>{t("register.description")}</p>
          </div>
        </div>

        <div className="login-panel">
          <div className="login-preferences"><LanguageSwitcher /><ThemeSwitcher /></div>
          <div className="login-card">
            <h2>{t("register.panelTitle")}</h2>
            <p id="register-help">{t("register.help")}</p>

            <form className="auth-form" onSubmit={submit} noValidate>
              <label className="form-field">
                <span className="field-label">{t("register.firstNameLabel")} <span className="req" aria-hidden="true">*</span></span>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" maxLength={100} required aria-required="true" />
              </label>
              <label className="form-field">
                <span className="field-label">{t("register.lastNameLabel")} <span className="req" aria-hidden="true">*</span></span>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" maxLength={100} required aria-required="true" />
              </label>
              <label className="form-field">
                <span className="field-label">{t("register.emailLabel")} <span className="req" aria-hidden="true">*</span></span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={320} required aria-required="true" />
              </label>
              <label className="form-field">
                <span className="field-label">{t("register.passwordLabel")} <span className="req" aria-hidden="true">*</span></span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} maxLength={120} required aria-required="true" />
                {passwordTooShort ? <small className="field-hint error">{t("register.passwordHint")}</small> : null}
              </label>
              <label className="form-field">
                <span className="field-label">{t("register.confirmLabel")} <span className="req" aria-hidden="true">*</span></span>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" minLength={8} maxLength={120} required aria-required="true" />
                {mismatch ? <small className="field-hint error">{t("register.mismatchHint")}</small> : null}
              </label>

              <p className="form-required-note">{t("common.requiredFields")}</p>
              {error ? <p className="login-error" role="alert">{error}</p> : null}

              <button className="ametis-login-button" type="submit" disabled={!canSubmit}>
                <span>{submitting ? t("register.submitting") : t("register.action")}</span>
              </button>
            </form>

            <p className="auth-alt">
              {t("register.haveAccount")} <Link href="/auth/login">{t("register.signInLink")}</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
