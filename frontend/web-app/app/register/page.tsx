"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/components/IntlProviderClient";
import { ApiError, registerUser } from "@/lib/api";
import { buildLoginHrefWithRedirect, resolveSafeRedirectTarget } from "@/lib/auth-redirect";

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.77 21.77 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a21.8 21.8 0 0 1-3.33 4.61" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="m1 1 22 22" />
    </svg>
  );
}

export default function RegisterPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const safeRedirectTarget = resolveSafeRedirectTarget(redirectParam);
  const loginHref = buildLoginHrefWithRedirect(safeRedirectTarget);
  const [prefersDarkMode, setPrefersDarkMode] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const applyPreference = () => setPrefersDarkMode(mediaQuery.matches);
    applyPreference();
    mediaQuery.addEventListener("change", applyPreference);
    return () => mediaQuery.removeEventListener("change", applyPreference);
  }, []);

  function resolveRegisterError(err: unknown): string {
    const fallback = t("auth.register.error");
    if (err instanceof Error && err.message.includes("Failed to fetch")) {
      return t("auth.network.error");
    }
    if (err instanceof ApiError) {
      if (err.code === "conflict") {
        const message = err.message.toLowerCase();
        if (message.includes("identity provider")) {
          return t("auth.register.error.identityExists");
        }
        if (message.includes("email already registered")) {
          return t("auth.register.error.emailExists");
        }
      }
      if (err.code === "identity_provider_error") {
        return t("auth.register.error.identityProvider");
      }
      if (err.code === "validation_error") {
        return t("auth.register.error.validation");
      }
      return fallback;
    }
    return fallback;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError(t("auth.register.passwordMismatch"));
      return;
    }
    if (!acceptTerms) {
      setError(t("auth.register.acceptTermsError"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await registerUser({ fullName, email, password });
      router.push(loginHref);
    } catch (err) {
      setError(resolveRegisterError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={`relative min-h-screen overflow-hidden ${prefersDarkMode ? "bg-[#050A1A]" : "bg-[#E9EEF8]"}`}>
      <div
        className={`absolute inset-0 ${
          prefersDarkMode
            ? "bg-[radial-gradient(circle_at_8%_8%,rgba(54,109,255,0.20),transparent_32%),radial-gradient(circle_at_100%_100%,rgba(25,78,220,0.28),transparent_36%),linear-gradient(90deg,#081126_0%,#07163A_40%,#041039_100%)]"
            : "bg-[radial-gradient(circle_at_8%_8%,rgba(117,152,233,0.30),transparent_35%),radial-gradient(circle_at_100%_100%,rgba(141,168,233,0.34),transparent_38%),linear-gradient(90deg,#EAF0FA_0%,#E4EBF8_45%,#DCE4F5_100%)]"
        }`}
      />
      <div className={`grid-pattern pointer-events-none absolute inset-0 ${prefersDarkMode ? "opacity-10" : "opacity-20"}`} aria-hidden="true" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-6 py-8">
        <p className={`absolute left-6 top-6 font-display text-3xl font-semibold md:left-10 md:top-8 ${prefersDarkMode ? "text-[#F2F6FF]" : "text-[#1C2F5C]"}`}>
          {t("brand.name")}
        </p>

        <section
          className={`w-full max-w-md rounded-2xl p-6 shadow-2xl backdrop-blur-sm ${
            prefersDarkMode ? "border border-brand-200/20 bg-[#141D2F]/90 text-white" : "border border-slate-300/70 bg-white/92 text-slate-900"
          }`}
        >
        <p className={`text-[14px] font-semibold uppercase tracking-[0.12em] ${prefersDarkMode ? "text-[#C7D2E4]" : "text-[#1C2F5C]"}`}>{t("register.tag")}</p>
        <h1 className={`mt-2 font-display text-2xl font-semibold ${prefersDarkMode ? "text-[#F2F6FF]" : "text-[#1C2F5C]"}`}>{t("register.title")}</h1>
        <p className={`mt-2 text-sm ${prefersDarkMode ? "text-[#C7D2E4]" : "text-slate-600"}`}>{t("register.description")}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <div className="space-y-1">
            <label
              htmlFor="register-full-name"
              className={`text-[14px] font-semibold tracking-[0.02em] ${prefersDarkMode ? "text-[#C7D2E4]" : "text-[#1C2F5C]"}`}
            >
              {t("auth.fullName")}
            </label>
            <input
              id="register-full-name"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder={t("auth.fullName.placeholder")}
              autoComplete="name"
              className={`w-full rounded-lg px-3 py-2 text-sm outline-none ${
                prefersDarkMode
                  ? "border border-slate-500/35 bg-slate-950/45 text-[#EAF0FF] placeholder:text-[#9FAFC9] focus:border-brand-300"
                  : "border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-brand-400"
              }`}
              required
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="register-email"
              className={`text-[14px] font-semibold tracking-[0.02em] ${prefersDarkMode ? "text-[#C7D2E4]" : "text-[#1C2F5C]"}`}
            >
              {t("auth.email")}
            </label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("auth.email.placeholder")}
              autoComplete="email"
              className={`w-full rounded-lg px-3 py-2 text-sm outline-none ${
                prefersDarkMode
                  ? "border border-slate-500/35 bg-slate-950/45 text-[#EAF0FF] placeholder:text-[#9FAFC9] focus:border-brand-300"
                  : "border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-brand-400"
              }`}
              required
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="register-password"
              className={`text-[14px] font-semibold tracking-[0.02em] ${prefersDarkMode ? "text-[#C7D2E4]" : "text-[#1C2F5C]"}`}
            >
              {t("auth.password")}
            </label>
            <div className="relative">
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t("auth.password.placeholder")}
                autoComplete="new-password"
                className={`w-full rounded-lg px-3 py-2 pr-10 text-sm outline-none ${
                  prefersDarkMode
                    ? "border border-slate-500/35 bg-slate-950/45 text-[#EAF0FF] placeholder:text-[#9FAFC9] focus:border-brand-300"
                    : "border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-brand-400"
                }`}
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className={`absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md transition ${
                  prefersDarkMode
                    ? "border border-slate-500/50 text-[#EAF0FF] hover:bg-brand-400/20"
                    : "border border-slate-300 text-slate-700 hover:bg-brand-100/50"
                }`}
                aria-label={showPassword ? t("auth.password.hide") : t("auth.password.show")}
                title={showPassword ? t("auth.password.hide") : t("auth.password.show")}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <p className={`text-xs ${prefersDarkMode ? "text-[#A8B6CD]" : "text-slate-500"}`}>{t("auth.password.rules")}</p>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="register-confirm-password"
              className={`text-[14px] font-semibold tracking-[0.02em] ${prefersDarkMode ? "text-[#C7D2E4]" : "text-[#1C2F5C]"}`}
            >
              {t("auth.password.confirm")}
            </label>
            <div className="relative">
              <input
                id="register-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={t("auth.password.confirmPlaceholder")}
                autoComplete="new-password"
                className={`w-full rounded-lg px-3 py-2 pr-10 text-sm outline-none ${
                  prefersDarkMode
                    ? "border border-slate-500/35 bg-slate-950/45 text-[#EAF0FF] placeholder:text-[#9FAFC9] focus:border-brand-300"
                    : "border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-brand-400"
                }`}
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                className={`absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md transition ${
                  prefersDarkMode
                    ? "border border-slate-500/50 text-[#EAF0FF] hover:bg-brand-400/20"
                    : "border border-slate-300 text-slate-700 hover:bg-brand-100/50"
                }`}
                aria-label={showConfirmPassword ? t("auth.password.hide") : t("auth.password.show")}
                title={showConfirmPassword ? t("auth.password.hide") : t("auth.password.show")}
              >
                {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <label className={`inline-flex items-start gap-2 text-xs ${prefersDarkMode ? "text-[#C7D2E4]" : "text-slate-700"}`}>
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(event) => setAcceptTerms(event.target.checked)}
              className={`mt-0.5 h-4 w-4 rounded ${prefersDarkMode ? "border border-slate-500/40 bg-slate-900/40 accent-[#5D8BFF]" : "border border-slate-400 bg-white accent-[#4C78E5]"}`}
            />
            <span>{t("auth.register.acceptTerms")}</span>
          </label>

          <button
            type="submit"
            disabled={submitting || !acceptTerms}
            className="inline-flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? t("auth.register.loading") : t("auth.register.submit")}
          </button>
        </form>

        {error ? <p className="mt-3 text-xs text-rose-400">{error}</p> : null}

        <div className="mt-6 flex gap-2">
          <Link
            href={loginHref}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-400"
          >
            {t("register.goLogin")}
          </Link>
        </div>
      </section>
      </div>
    </main>
  );
}
