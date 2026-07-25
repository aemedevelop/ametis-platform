"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/components/IntlProviderClient";
import { ApiError, loginUser } from "@/lib/api";
import { resolveSafeRedirectTarget } from "@/lib/auth-redirect";

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

export default function LoginPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefersDarkMode, setPrefersDarkMode] = useState(true);
  const redirectParam = searchParams.get("redirect");
  const redirectTarget = resolveSafeRedirectTarget(redirectParam);

  useEffect(() => {
    const reason = searchParams.get("reason");
    if (reason === "expired") {
      setError(t("auth.session.expired"));
    }
  }, [searchParams, t]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const applyPreference = () => setPrefersDarkMode(mediaQuery.matches);
    applyPreference();
    mediaQuery.addEventListener("change", applyPreference);
    return () => mediaQuery.removeEventListener("change", applyPreference);
  }, []);

  function resolveLoginError(err: unknown): string {
    const fallback = t("auth.login.error");
    if (err instanceof Error && err.message.includes("Failed to fetch")) {
      return t("auth.network.error");
    }
    if (err instanceof ApiError) {
      if (err.code === "authentication_error" || err.status === 401) {
        return t("auth.login.error.invalidCredentials");
      }
      if (err.code === "identity_provider_error") {
        return t("auth.login.error.identityProvider");
      }
      if (err.code === "validation_error") {
        return t("auth.login.error.validation");
      }
      return fallback;
    }
    return fallback;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await loginUser({ username, password });
      const storage = rememberSession ? localStorage : sessionStorage;
      const cleanupStorage = rememberSession ? sessionStorage : localStorage;

      cleanupStorage.removeItem("core_access_token");
      cleanupStorage.removeItem("core_refresh_token");

      storage.setItem("core_access_token", response.accessToken);
      if (response.refreshToken) {
        storage.setItem("core_refresh_token", response.refreshToken);
      }
      if (redirectTarget.startsWith("/")) {
        router.push(redirectTarget);
      } else if (typeof window !== "undefined") {
        window.location.assign(redirectTarget);
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(resolveLoginError(err));
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
      <div className={`grid-pattern pointer-events-none absolute inset-0 ${prefersDarkMode ? "opacity-10" : "opacity-20"}`} />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-6 py-8">
        <p className={`absolute left-6 top-6 font-display text-3xl font-semibold md:left-10 md:top-8 ${prefersDarkMode ? "text-[#F2F6FF]" : "text-[#1C2F5C]"}`}>
          {t("brand.name")}
        </p>

        <section className="flex w-full items-center justify-center">
          <div
            className={`w-full max-w-md rounded-2xl p-6 shadow-2xl backdrop-blur-sm ${
              prefersDarkMode ? "border border-brand-200/20 bg-[#141D2F]/90 text-white" : "border border-slate-300/70 bg-white/92 text-slate-900"
            }`}
          >
          <div>
          <p className={`text-[14px] font-semibold uppercase tracking-[0.12em] ${prefersDarkMode ? "text-[#C7D2E4]" : "text-[#1C2F5C]"}`}>{t("login.access")}</p>
          <h2 className={`mt-2 font-display text-2xl font-semibold ${prefersDarkMode ? "text-[#F2F6FF]" : "text-[#1C2F5C]"}`}>{t("login.signin")}</h2>
          <p className={`mt-2 text-sm ${prefersDarkMode ? "text-[#C7D2E4]" : "text-slate-600"}`}>{t("login.description")}</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <div className="space-y-1">
              <label
                htmlFor="login-email"
                className={`text-[14px] font-semibold leading-none tracking-[0.02em] ${prefersDarkMode ? "text-[#C7D2E4]" : "text-[#1C2F5C]"}`}
              >
                {t("auth.email")}
              </label>
              <input
                id="login-email"
                type="email"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
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
                htmlFor="login-password"
                className={`text-[14px] font-semibold leading-none tracking-[0.02em] ${prefersDarkMode ? "text-[#C7D2E4]" : "text-[#1C2F5C]"}`}
              >
                {t("auth.password")}
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t("auth.password.placeholder")}
                  autoComplete="current-password"
                  className={`w-full rounded-lg px-3 py-2 pr-10 text-sm outline-none ${
                    prefersDarkMode
                      ? "border border-slate-500/35 bg-slate-950/45 text-[#EAF0FF] placeholder:text-[#9FAFC9] focus:border-brand-300"
                      : "border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-brand-400"
                  }`}
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
            </div>

            <div className="flex items-center justify-between">
              <label className={`inline-flex items-center gap-2 text-xs ${prefersDarkMode ? "text-[#C7D2E4]" : "text-slate-700"}`}>
                <input
                  type="checkbox"
                  checked={rememberSession}
                  onChange={(event) => setRememberSession(event.target.checked)}
                  className={`h-4 w-4 rounded ${prefersDarkMode ? "border border-slate-500/40 bg-slate-900/40 accent-[#5D8BFF]" : "border border-slate-400 bg-white accent-[#4C78E5]"}`}
                />
                <span>{t("auth.login.rememberSession")}</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-60"
            >
              {submitting ? t("auth.login.loading") : t("login.enter")}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className={`h-px flex-1 ${prefersDarkMode ? "bg-brand-200/25" : "bg-slate-300"}`} />
            <span className={`text-sm font-semibold ${prefersDarkMode ? "text-[#C7D2E4]" : "text-slate-600"}`}>{t("auth.login.or")}</span>
            <div className={`h-px flex-1 ${prefersDarkMode ? "bg-brand-200/25" : "bg-slate-300"}`} />
          </div>

          <button
            type="button"
            disabled
            title={t("auth.login.googleDisabledHint")}
            className={`inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold opacity-80 ${
              prefersDarkMode ? "border border-brand-200/30 bg-transparent text-[#B8C4D9]" : "border border-slate-300 bg-white text-slate-600"
            }`}
          >
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold ${
                prefersDarkMode ? "border-slate-400/70 text-[#D4DDEE]" : "border-slate-400 text-slate-600"
              }`}
            >
              G
            </span>
            {t("auth.login.googleSoon")}
          </button>

          {error ? <p className="mt-3 text-xs text-rose-400">{error}</p> : null}

          <p className={`mt-4 text-xs leading-relaxed ${prefersDarkMode ? "text-[#A8B6CD]" : "text-slate-600"}`}>{t("login.redirect")}</p>
          <p className={`mt-2 text-xs leading-relaxed ${prefersDarkMode ? "text-[#A8B6CD]" : "text-slate-600"}`}>{t("auth.login.legal")}</p>
          </div>
        </section>
        </div>
    </main>
  );
}
