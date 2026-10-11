"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { useLocale, useT } from "@/components/IntlProviderClient";
import { PasswordInput } from "@/components/password-input";
import {
  AgentFactoryApiError,
  AnalyticsAccess,
  exportAgentAnalytics,
  fetchAgentAnalytics,
  fetchAnalyticsAccess,
  fetchAnalyticsAgents,
  saveAnalyticsAccess
} from "@/lib/agent-factory-api";

export default function AgentAnalyticsPage() {
  const t = useT();
  const params = useParams();
  const id = String(params.id);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [accessOpen, setAccessOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAnalyticsAgents()
      .then((agents) => {
        if (!cancelled) setAgentName(agents.find((agent) => agent.id === id)?.name ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id]);

  const loadAnalytics = useCallback((fromIso: string, toIso: string) => fetchAgentAnalytics(id, fromIso, toIso), [id]);
  const exportAnalytics = useCallback(
    (fromIso: string, toIso: string, lang: string) => exportAgentAnalytics(id, fromIso, toIso, lang),
    [id]
  );

  return (
    <>
      <AnalyticsDashboard
        agentName={agentName}
        loadAnalytics={loadAnalytics}
        exportAnalytics={exportAnalytics}
        withTour
        actions={(
          <>
            <button className="icon-button" type="button" onClick={() => setAccessOpen(true)} aria-label={t("analytics.access.open")} data-tooltip={t("analytics.access.open")} data-tour="analytics-access">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" /></svg>
            </button>
            <Link className="icon-button" href="/analytics" aria-label={t("analytics.back")} data-tooltip={t("analytics.back")}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></svg>
            </Link>
          </>
        )}
      />
      {accessOpen ? <ClientAccessDialog agentId={id} onClose={() => setAccessOpen(false)} /> : null}
    </>
  );
}

/**
 * Publicar las analíticas del agente para su cliente final: el consultor
 * define usuario y contraseña y entrega la URL. No caduca; vale mientras el
 * agente exista y siga publicado.
 */
function ClientAccessDialog({ agentId, onClose }: { agentId: string; onClose: () => void }) {
  const t = useT();
  const { locale } = useLocale();
  const [access, setAccess] = useState<AnalyticsAccess | null>(null);
  const [published, setPublished] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAnalyticsAccess(agentId)
      .then((result) => {
        if (cancelled) return;
        setAccess(result);
        setPublished(result.published);
        setUsername(result.username);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError);
      });
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  // La contraseña solo es obligatoria la primera vez; después, vacía = conservar la actual.
  const firstTime = access !== null && access.publicId === null;
  const url = access?.publicId ? `${window.location.origin}/client/analytics/${access.publicId}` : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const result = await saveAnalyticsAccess(agentId, { published, username, password });
      setAccess(result);
      setPassword("");
      setSaved(true);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  async function copyUrl() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <form className="confirmation-dialog client-access-dialog" role="dialog" aria-modal="true" aria-labelledby="client-access-title" onSubmit={submit}>
        <h2 id="client-access-title">{t("analytics.access.title")}</h2>
        <p>{t("analytics.access.description")}</p>

        {access ? (
          <>
            <button
              type="button"
              className={`toggle-switch ${published ? "on" : ""}`}
              role="switch"
              aria-checked={published}
              onClick={() => setPublished((current) => !current)}
            >
              <span className="toggle-switch-track" aria-hidden="true" />
              <span className="toggle-switch-label">{t(published ? "analytics.access.publishedOn" : "analytics.access.publishedOff")}</span>
            </button>
            <label className="form-field">
              <span className="field-label">{t("analytics.access.username")}</span>
              <input value={username} onChange={(event) => setUsername(event.target.value)} maxLength={120} required autoComplete="off" />
            </label>
            <label className="form-field">
              <span className="field-label">{t(firstTime ? "analytics.access.password" : "analytics.access.newPassword")}</span>
              <PasswordInput
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                maxLength={72}
                required={firstTime}
                placeholder={firstTime ? "" : t("analytics.access.passwordKeep")}
                autoComplete="new-password"
              />
            </label>
            {url ? (
              <div className="form-field">
                <span className="field-label">{t("analytics.access.url")}</span>
                <div className="client-access-url">
                  <input value={url} readOnly onFocus={(event) => event.target.select()} />
                  <button className="secondary-button" type="button" onClick={copyUrl}>{t(copied ? "common.copied" : "common.copy")}</button>
                </div>
              </div>
            ) : null}
            {access.lastAccessAt ? (
              <small className="muted-copy">{t("analytics.access.lastAccess", { date: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(access.lastAccessAt)) })}</small>
            ) : null}
          </>
        ) : !error ? (
          <p role="status">{t("analytics.loading")}</p>
        ) : null}

        {error ? <div className="alert error" role="alert"><span>{messageOf(error, t)}</span></div> : null}
        {saved ? <div className="alert success" role="status"><span>{t("analytics.access.saved")}</span></div> : null}

        <div className="confirmation-actions">
          <button className="secondary-button" type="button" onClick={onClose} disabled={saving}>{t("common.close")}</button>
          <button className="primary-button" type="submit" disabled={saving || !access}>{t(saving ? "analytics.access.saving" : "analytics.access.save")}</button>
        </div>
      </form>
    </div>
  );
}

function messageOf(error: unknown, t: (key: string, vars?: Record<string, string | number>) => string): string {
  if (error instanceof AgentFactoryApiError) return t(error.code, error.variables);
  return t("common.unexpectedError");
}
