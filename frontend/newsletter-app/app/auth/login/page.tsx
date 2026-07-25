"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginUser, AuthClientError } from "@/lib/auth-client";

type OnboardingStatus = {
  activeTenantId: string | null;
  tenants: Array<{ id: string }>;
};

function resolveRedirectTarget(raw: string | null): string {
  if (!raw || raw.trim().length === 0) return "/";
  const value = raw.trim();
  if (value.startsWith("/")) {
    if (value.startsWith("/auth/login") || value.startsWith("/auth/callback")) {
      return "/";
    }
    return value;
  }
  try {
    const parsed = new URL(value);
    if (typeof window !== "undefined" && parsed.origin === window.location.origin) {
      const internalTarget = parsed.pathname + parsed.search + parsed.hash;
      if (internalTarget.startsWith("/auth/login") || internalTarget.startsWith("/auth/callback")) {
        return "/";
      }
      return internalTarget;
    }
  } catch {
    return "/";
  }
  return "/";
}

async function resolveTenantForSession(accessToken: string): Promise<string | null> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_NEWSLETTER_API_BASE_URL ?? "http://localhost:8082";
  try {
    const response = await fetch(`${apiBaseUrl}/api/newsletter/onboarding/status`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as OnboardingStatus;
    return payload.activeTenantId || payload.tenants[0]?.id || null;
  } catch {
    return null;
  }
}

export default function NewsletterLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberSession, setRememberSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTarget = resolveRedirectTarget(searchParams.get("redirect"));

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const tokens = await loginUser({ username: email, password });
      const storage = rememberSession ? localStorage : sessionStorage;
      const cleanupStorage = rememberSession ? sessionStorage : localStorage;

      cleanupStorage.removeItem("core_access_token");
      cleanupStorage.removeItem("core_refresh_token");
      cleanupStorage.removeItem("active_tenant_id");

      storage.setItem("core_access_token", tokens.accessToken);
      if (tokens.refreshToken) {
        storage.setItem("core_refresh_token", tokens.refreshToken);
      }

      localStorage.removeItem("active_tenant_id");
      sessionStorage.removeItem("active_tenant_id");
      const activeTenantId = await resolveTenantForSession(tokens.accessToken);
      if (activeTenantId) {
        storage.setItem("active_tenant_id", activeTenantId);
      }

      router.push(redirectTarget);
    } catch (err) {
      if (err instanceof AuthClientError && err.status === 401) {
        setError("Credenciales incorrectas. Revisa tu correo y contraseña.");
      } else if (err instanceof Error && err.message.includes("Failed to fetch")) {
        setError("No se pudo conectar con el servicio de autenticación.");
      } else {
        setError("No se pudo completar el inicio de sesión.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050A1A]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_8%,rgba(54,109,255,0.20),transparent_32%),radial-gradient(circle_at_100%_100%,rgba(25,78,220,0.28),transparent_36%),linear-gradient(90deg,#081126_0%,#07163A_40%,#041039_100%)]" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-6 py-8">
        <section className="w-full max-w-md rounded-2xl border border-brand-200/20 bg-[#141D2F]/90 p-6 text-white shadow-2xl backdrop-blur-sm">
          <p className="text-[14px] font-semibold uppercase tracking-[0.12em] text-[#C7D2E4]">Acceso seguro</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-[#F2F6FF]">Iniciar sesión</h1>
          <p className="mt-2 text-sm text-[#C7D2E4]">Inicia sesión con tu cuenta para continuar.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <label className="block">
              <span className="mb-1 block text-[14px] font-semibold text-[#C7D2E4]">Correo electrónico</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@dominio.com"
                className="w-full rounded-lg border border-slate-500/35 bg-slate-950/45 px-3 py-2 text-sm text-[#EAF0FF] outline-none placeholder:text-[#9FAFC9] focus:border-brand-300"
                autoComplete="email"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[14px] font-semibold text-[#C7D2E4]">Contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Introduce tu contraseña"
                className="w-full rounded-lg border border-slate-500/35 bg-slate-950/45 px-3 py-2 text-sm text-[#EAF0FF] outline-none placeholder:text-[#9FAFC9] focus:border-brand-300"
                autoComplete="current-password"
                required
              />
            </label>

            <label className="inline-flex items-center gap-2 text-xs text-[#C7D2E4]">
              <input
                type="checkbox"
                checked={rememberSession}
                onChange={(e) => setRememberSession(e.target.checked)}
                className="h-4 w-4 rounded border border-slate-500/40 bg-slate-900/40 accent-[#5D8BFF]"
              />
              <span>Mantener sesión iniciada</span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-60"
            >
              {submitting ? "Autenticando..." : "Iniciar sesión"}
            </button>
          </form>

          {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-brand-200/25" />
            <span className="text-sm font-semibold text-[#C7D2E4]">o</span>
            <div className="h-px flex-1 bg-brand-200/25" />
          </div>

          <button
            type="button"
            disabled
            className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full border border-brand-200/30 bg-transparent px-4 py-2.5 text-sm font-semibold text-[#B8C4D9] opacity-80"
            title="Inicio de sesión con Google disponible próximamente."
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-400/70 text-xs font-bold text-[#D4DDEE]">
              G
            </span>
            Continuar con Google (próximamente)
          </button>
        </section>
      </div>
    </main>
  );
}
