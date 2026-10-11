"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { useT } from "@/components/IntlProviderClient";
import { PasswordInput } from "@/components/password-input";
import { AgentFactoryApiError } from "@/lib/agent-factory-api";
import {
  ClientAnalyticsSession,
  clearClientAnalyticsSession,
  exportClientAnalytics,
  fetchClientAnalytics,
  getClientAnalyticsSession,
  loginClientAnalytics
} from "@/lib/client-analytics-api";

/**
 * Analíticas de un agente para su cliente final. Vive fuera de la carcasa y
 * de la sesión de la plataforma: se entra con el usuario y contraseña que
 * definió el consultor al publicar el acceso.
 */
export default function ClientAnalyticsPage() {
  const t = useT();
  const params = useParams();
  const publicId = String(params.publicId);
  const [session, setSession] = useState<ClientAnalyticsSession | null>(null);
  // Hasta leer sessionStorage no se sabe si hay sesión; evita el parpadeo del login.
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSession(getClientAnalyticsSession(publicId));
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [publicId]);

  const signOut = useCallback((reason: string | null) => {
    clearClientAnalyticsSession(publicId);
    setSession(null);
    setNotice(reason);
  }, [publicId]);

  // Sesión caducada, contraseña cambiada o acceso despublicado: de vuelta al login.
  const guard = useCallback(async <T,>(request: Promise<T>): Promise<T> => {
    try {
      return await request;
    } catch (error) {
      if (error instanceof AgentFactoryApiError && (error.status === 401 || error.status === 404)) {
        signOut(error.code);
      }
      throw error;
    }
  }, [signOut]);

  const token = session?.token ?? "";
  const loadAnalytics = useCallback(
    (fromIso: string, toIso: string) => guard(fetchClientAnalytics(publicId, token, fromIso, toIso)),
    [guard, publicId, token]
  );
  const exportAnalytics = useCallback(
    (fromIso: string, toIso: string, lang: string) => guard(exportClientAnalytics(publicId, token, fromIso, toIso, lang)),
    [guard, publicId, token]
  );

  if (!ready) return <main className="center-screen" role="status">{t("analytics.loading")}</main>;

  if (!session) {
    return <ClientLogin publicId={publicId} notice={notice} onSignedIn={(next) => { setNotice(null); setSession(next); }} />;
  }

  return (
    <main className="content-shell client-analytics">
      <AnalyticsDashboard
        agentName={session.agentName}
        loadAnalytics={loadAnalytics}
        exportAnalytics={exportAnalytics}
        actions={(
          <button className="icon-button" type="button" onClick={() => signOut(null)} aria-label={t("clientAnalytics.signOut")} data-tooltip={t("clientAnalytics.signOut")}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l5-5-5-5" /><path d="M15 12H4" /></svg>
          </button>
        )}
      />
    </main>
  );
}

function ClientLogin({ publicId, notice, onSignedIn }: {
  publicId: string;
  notice: string | null;
  onSignedIn: (session: ClientAnalyticsSession) => void;
}) {
  const t = useT();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(notice);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      onSignedIn(await loginClientAnalytics(publicId, username, password));
    } catch (requestError) {
      setError(requestError instanceof AgentFactoryApiError ? requestError.code : "common.unexpectedError");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="center-screen">
      <form className="client-login" onSubmit={submit} aria-labelledby="client-login-title">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">A</span>
          <span><strong>{t("brand.company")}</strong><small>{t("brand.product")}</small></span>
        </div>
        <h1 id="client-login-title">{t("clientAnalytics.loginTitle")}</h1>
        <p>{t("clientAnalytics.loginDescription")}</p>
        <label className="form-field">
          <span className="field-label">{t("analytics.access.username")}</span>
          <input value={username} onChange={(event) => setUsername(event.target.value)} required autoComplete="username" autoFocus />
        </label>
        <label className="form-field">
          <span className="field-label">{t("analytics.access.password")}</span>
          <PasswordInput value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
        </label>
        {error ? <div className="alert error" role="alert"><span>{t(error)}</span></div> : null}
        <button className="primary-button" type="submit" disabled={submitting}>{t(submitting ? "clientAnalytics.signingIn" : "clientAnalytics.signIn")}</button>
      </form>
    </main>
  );
}
