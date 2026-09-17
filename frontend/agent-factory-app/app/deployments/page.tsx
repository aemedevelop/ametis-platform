"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useT } from "@/components/IntlProviderClient";
import {
  AgentDefinition,
  AgentDeployment,
  AgentFactoryApiError,
  createDeployment,
  deleteDeployment,
  DeploymentChannelType,
  DeploymentStatus,
  fetchAgents,
  fetchDeployments,
  regenerateDeploymentPublicId,
  updateDeployment
} from "@/lib/agent-factory-api";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

type FormState = {
  agentId: string;
  name: string;
  channelType: DeploymentChannelType;
  deploymentSlug: string;
  status: DeploymentStatus;
  apiKey: string;
  welcomeMessage: string;
  rateLimitPerMinute: string;
  rateLimitPerDay: string;
  allowedOrigins: string;
};

const emptyForm: FormState = {
  agentId: "",
  name: "",
  channelType: "WEB_CHAT",
  deploymentSlug: "",
  status: "ACTIVE",
  apiKey: "",
  welcomeMessage: "",
  rateLimitPerMinute: "",
  rateLimitPerDay: "",
  allowedOrigins: ""
};

export default function DeploymentsPage() {
  const t = useT();
  const { locale } = useLocale();
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [deployments, setDeployments] = useState<AgentDeployment[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deploymentToDelete, setDeploymentToDelete] = useState<AgentDeployment | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  async function copyText(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1500);
    } catch {
      /* clipboard no disponible: se ignora */
    }
  }

  async function regeneratePublicId(deployment: AgentDeployment) {
    setRegeneratingId(deployment.id);
    setError(null);
    try {
      const updated = await regenerateDeploymentPublicId(deployment.id);
      setDeployments((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (requestError) {
      setError(requestError);
    } finally {
      setRegeneratingId(null);
    }
  }

  const readyAgents = useMemo(() => agents.filter((agent) => agent.status === "READY"), [agents]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [currentAgents, currentDeployments] = await Promise.all([
        fetchAgents(),
        fetchDeployments()
      ]);
      setAgents(currentAgents);
      setDeployments(currentDeployments);
      setForm((current) => ({
        ...current,
        agentId: current.agentId || currentAgents.find((agent) => agent.status === "READY")?.id || ""
      }));
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      load();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        agentId: form.agentId,
        name: form.name.trim(),
        channelType: form.channelType,
        deploymentSlug: form.deploymentSlug.trim(),
        status: form.status,
        apiKey: form.apiKey.trim() || undefined,
        welcomeMessage: form.welcomeMessage.trim() || undefined,
        rateLimitPerMinute: parseLimit(form.rateLimitPerMinute),
        rateLimitPerDay: parseLimit(form.rateLimitPerDay),
        allowedOrigins: parseOrigins(form.allowedOrigins)
      };
      if (editingId) {
        const updated = await updateDeployment(editingId, payload);
        setDeployments((current) => current.map((item) => item.id === updated.id ? updated : item));
      } else {
        const created = await createDeployment(payload);
        setDeployments((current) => [created, ...current]);
      }
      resetForm();
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deploymentToDelete) return;
    setDeletingId(deploymentToDelete.id);
    setError(null);
    try {
      await deleteDeployment(deploymentToDelete.id);
      setDeployments((current) => current.filter((item) => item.id !== deploymentToDelete.id));
      setDeploymentToDelete(null);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setDeletingId(null);
    }
  }

  function edit(deployment: AgentDeployment) {
    setEditingId(deployment.id);
    setForm({
      agentId: deployment.agentId,
      name: deployment.name,
      channelType: deployment.channelType,
      deploymentSlug: deployment.deploymentSlug,
      status: deployment.status,
      apiKey: "",
      welcomeMessage: deployment.welcomeMessage || "",
      rateLimitPerMinute: deployment.rateLimitPerMinute != null ? String(deployment.rateLimitPerMinute) : "",
      rateLimitPerDay: deployment.rateLimitPerDay != null ? String(deployment.rateLimitPerDay) : "",
      allowedOrigins: (deployment.allowedOrigins ?? []).join("\n")
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      agentId: readyAgents[0]?.id || ""
    });
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
      deploymentSlug: key === "name" && !editingId ? slugify(String(value)) : current.deploymentSlug
    }));
  }

  if (loading) {
    return <section className="loading-card" role="status"><span className="spinner" aria-hidden="true" />{t("deployments.loading")}</section>;
  }

  return (
    <div className="page-grid">
      <section className="intro-card">
        <div>
          <span className="eyebrow blue">{t("deployments.phase")}</span>
          <h2>{t("deployments.title")}</h2>
          <p>{t("deployments.description")}</p>
        </div>
        <span className="phase-badge">{t("deployments.statusDraft")}</span>
      </section>

      {error ? <div className="alert error" role="alert"><strong>{t("operation.failedTitle")}</strong><span>{messageOf(error, t)}</span></div> : null}

      <section className="knowledge-layout deployments-layout">
        <form className="knowledge-form" onSubmit={submit}>
          <div>
            <span className="eyebrow">{t("deployments.createEyebrow")}</span>
            <h2>{t(editingId ? "deployments.editTitle" : "deployments.createTitle")}</h2>
            <p>{t(editingId ? "deployments.editDescription" : "deployments.createDescription")}</p>
          </div>
          <label className="form-field">
            <span className="field-label">
              {t("deployments.agentLabel")} <span className="req" aria-hidden="true">*</span>
              <span className="field-help" tabIndex={0} aria-label={t("deployments.agentHelp")} title={t("deployments.agentHelp")}>?</span>
            </span>
            <select value={form.agentId} onChange={(event) => setField("agentId", event.target.value)} required aria-required="true">
              <option value="">{t("deployments.agentPlaceholder")}</option>
              {readyAgents.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
          </label>
          {!readyAgents.length ? <p className="muted-copy">{t("deployments.noReadyAgents")}</p> : null}
          <label className="form-field">
            <span className="field-label">
              {t("deployments.nameLabel")} <span className="req" aria-hidden="true">*</span>
              <span className="field-help" tabIndex={0} aria-label={t("deployments.nameHelp")} title={t("deployments.nameHelp")}>?</span>
            </span>
            <input value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder={t("deployments.namePlaceholder")} required aria-required="true" />
          </label>
          <label className="form-field">
            <span className="field-label">
              {t("deployments.channelLabel")}
              <span className="field-help" tabIndex={0} aria-label={t("deployments.channelHelp")} title={t("deployments.channelHelp")}>?</span>
            </span>
            <select value={form.channelType} onChange={(event) => setField("channelType", event.target.value as DeploymentChannelType)}>
              <option value="WEB_CHAT">{t("deployments.channel.web_chat")}</option>
            </select>
            <small className="field-limit">{t("deployments.channelSoon")}</small>
          </label>
          <label className="form-field">
            <span className="field-label">
              {t("deployments.slugLabel")} <span className="req" aria-hidden="true">*</span>
              <span className="field-help" tabIndex={0} aria-label={t("deployments.slugHelp")} title={t("deployments.slugHelp")}>?</span>
            </span>
            <input value={form.deploymentSlug} onChange={(event) => setField("deploymentSlug", slugify(event.target.value))} placeholder={t("deployments.slugPlaceholder")} required aria-required="true" />
            <small className="field-limit">{t("deployments.slugHint")}</small>
          </label>
          {form.channelType !== "WEB_CHAT" ? (
            <label className="form-field">
              <span className="field-label">
                {t("deployments.apiKeyLabel")}
                <span className="field-help" tabIndex={0} aria-label={t("deployments.apiKeyHelp")} title={t("deployments.apiKeyHelp")}>?</span>
              </span>
              <input value={form.apiKey} onChange={(event) => setField("apiKey", event.target.value)} placeholder={editingId ? t("deployments.apiKeyEditPlaceholder") : t("deployments.apiKeyPlaceholder")} />
            </label>
          ) : null}
          <label className="form-field">
            <span className="field-label">
              {t("deployments.welcomeMessageLabel")}
              <span className="field-help" tabIndex={0} aria-label={t("deployments.welcomeMessageHelp")} title={t("deployments.welcomeMessageHelp")}>?</span>
            </span>
            <textarea value={form.welcomeMessage} onChange={(event) => setField("welcomeMessage", event.target.value)} placeholder={t("deployments.welcomeMessagePlaceholder")} maxLength={500} />
          </label>
          <div className="form-split">
            <label className="form-field">
              <span className="field-label">
                {t("deployments.rateLimitMinuteLabel")}
                <span className="field-help" tabIndex={0} aria-label={t("deployments.rateLimitMinuteHelp")} title={t("deployments.rateLimitMinuteHelp")}>?</span>
              </span>
              <input type="number" min={1} inputMode="numeric" value={form.rateLimitPerMinute} onChange={(event) => setField("rateLimitPerMinute", event.target.value)} placeholder={t("deployments.rateLimitPlaceholder")} />
            </label>
            <label className="form-field">
              <span className="field-label">
                {t("deployments.rateLimitDayLabel")}
                <span className="field-help" tabIndex={0} aria-label={t("deployments.rateLimitDayHelp")} title={t("deployments.rateLimitDayHelp")}>?</span>
              </span>
              <input type="number" min={1} inputMode="numeric" value={form.rateLimitPerDay} onChange={(event) => setField("rateLimitPerDay", event.target.value)} placeholder={t("deployments.rateLimitPlaceholder")} />
            </label>
          </div>
          <label className="form-field">
            <span className="field-label">
              {t("deployments.allowedOriginsLabel")}
              <span className="field-help" tabIndex={0} aria-label={t("deployments.allowedOriginsHelp")} title={t("deployments.allowedOriginsHelp")}>?</span>
            </span>
            <textarea value={form.allowedOrigins} onChange={(event) => setField("allowedOrigins", event.target.value)} placeholder={t("deployments.allowedOriginsPlaceholder")} rows={3} />
            <small className="field-limit">{t("deployments.allowedOriginsHint")}</small>
          </label>
          {editingId ? (
            <label className="form-field">
              <span className="field-label">
                {t("deployments.statusLabel")}
                <span className="field-help" tabIndex={0} aria-label={t("deployments.statusHelp")} title={t("deployments.statusHelp")}>?</span>
              </span>
              <select value={form.status} onChange={(event) => setField("status", event.target.value as DeploymentStatus)}>
                <option value="ACTIVE">{t("deployments.status.active")}</option>
                <option value="INACTIVE">{t("deployments.status.inactive")}</option>
              </select>
            </label>
          ) : null}
          <p className="form-required-note">{t("common.requiredFields")}</p>
          <div className="form-actions">
            {editingId ? <button className="secondary-button" type="button" onClick={resetForm} disabled={saving}>{t("common.cancel")}</button> : null}
            <button className="primary-button" type="submit" disabled={saving || !form.agentId || !form.name.trim() || !form.deploymentSlug.trim()}>
              {saving ? t(editingId ? "deployments.updating" : "deployments.creating") : t(editingId ? "deployments.updateAction" : "deployments.createAction")}
            </button>
          </div>
        </form>

        <section className="knowledge-list">
          <div className="section-heading">
            <div>
              <span className="eyebrow blue">{t("deployments.inventory")}</span>
              <h2>{t("deployments.listTitle")}</h2>
              <p className="section-description">{t("deployments.listDescription")}</p>
            </div>
            <span className="count-badge">{t(deployments.length === 1 ? "deployments.count.one" : "deployments.count.other", { count: deployments.length })}</span>
          </div>
          {deployments.length ? (
            <div className="knowledge-items">
              {deployments.map((deployment) => (
                <article className="knowledge-item deployment-item" key={deployment.id}>
                  <div>
                    <span className={`status-badge ${deployment.status === "ACTIVE" ? "stored" : "inactive"}`}>{t(`deployments.status.${deployment.status.toLowerCase()}`)}</span>
                    <h3>{deployment.name}</h3>
                    <p>{deployment.agentName || t("deployments.agentMissing")}</p>
                    <small>{t("deployments.updatedAt", { date: formatDate(deployment.updatedAt, locale) })}</small>
                    <div className="deployment-endpoints">
                      <CopyRow
                        label={t("deployments.queryUrlLabel")}
                        value={deployment.queryUrl}
                        copyLabel={t("common.copy")}
                        copiedLabel={t("common.copied")}
                        copied={copiedKey === `${deployment.id}:query`}
                        onCopy={() => copyText(deployment.queryUrl, `${deployment.id}:query`)}
                      />
                      {deployment.embedSnippet ? (
                        <CopyRow
                          label={t("deployments.embedLabel")}
                          value={deployment.embedSnippet}
                          copyLabel={t("common.copy")}
                          copiedLabel={t("common.copied")}
                          copied={copiedKey === `${deployment.id}:embed`}
                          onCopy={() => copyText(deployment.embedSnippet ?? "", `${deployment.id}:embed`)}
                        />
                      ) : null}
                      <button
                        className="link-button"
                        type="button"
                        onClick={() => regeneratePublicId(deployment)}
                        disabled={regeneratingId === deployment.id}
                      >
                        {regeneratingId === deployment.id ? t("deployments.regenerating") : t("deployments.regeneratePublicId")}
                      </button>
                    </div>
                  </div>
                  <div className="knowledge-meta deployment-meta">
                    <strong>{t(`deployments.channel.${deployment.channelType.toLowerCase()}`)}</strong>
                    <span>{deployment.deploymentSlug}</span>
                    <span>{formatLimits(deployment, t)}</span>
                    <span>{(deployment.allowedOrigins?.length ?? 0)
                      ? t("deployments.allowedOriginsValue", { count: deployment.allowedOrigins.length })
                      : t("deployments.allowedOriginsNone")}</span>
                    <div className="item-actions">
                      {deployment.channelType === "WEB_CHAT" ? (
                        <Link className="small-action" href={`/deployments/${deployment.id}/appearance`}>
                          {t("deployments.appearanceAction")}
                        </Link>
                      ) : null}
                      <button className="icon-button" type="button" onClick={() => edit(deployment)} aria-label={t("deployments.edit", { name: deployment.name })} title={t("deployments.edit", { name: deployment.name })}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                      </button>
                      <button className="icon-button danger" type="button" onClick={() => setDeploymentToDelete(deployment)} disabled={deletingId === deployment.id} aria-label={t("deployments.delete", { name: deployment.name })} title={t("deployments.delete", { name: deployment.name })}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state compact"><span aria-hidden="true">0</span><strong>{t("deployments.emptyTitle")}</strong><p>{t("deployments.emptyDescription")}</p></div>
          )}
        </section>
      </section>
      {deploymentToDelete ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deletingId) setDeploymentToDelete(null); }}>
          <section className="confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-deployment-title" aria-describedby="delete-deployment-description">
            <span className="confirmation-icon" aria-hidden="true">!</span>
            <h2 id="delete-deployment-title">{t("deployments.deleteDialog.title")}</h2>
            <p id="delete-deployment-description">{t("deployments.deleteDialog.description", { name: deploymentToDelete.name })}</p>
            <div className="confirmation-actions">
              <button className="secondary-button" type="button" onClick={() => setDeploymentToDelete(null)} disabled={deletingId === deploymentToDelete.id}>{t("common.cancel")}</button>
              <button className="danger-button" type="button" onClick={remove} disabled={deletingId === deploymentToDelete.id}>{deletingId === deploymentToDelete.id ? t("deployments.deleting") : t("deployments.deleteAction")}</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function messageOf(error: unknown, t: Translate): string {
  if (error instanceof AgentFactoryApiError) return t(error.code, error.variables);
  return t("common.unexpectedError");
}

function CopyRow({
  label,
  value,
  copyLabel,
  copiedLabel,
  copied,
  onCopy
}: {
  label: string;
  value: string;
  copyLabel: string;
  copiedLabel: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="copy-row">
      <span className="copy-row-label">{label}</span>
      <code className="copy-row-value">{value}</code>
      <button className="link-button" type="button" onClick={onCopy}>
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatLimits(deployment: AgentDeployment, t: Translate): string {
  const parts: string[] = [];
  if (deployment.rateLimitPerMinute != null) {
    parts.push(t("deployments.rateLimitMinuteValue", { count: deployment.rateLimitPerMinute }));
  }
  if (deployment.rateLimitPerDay != null) {
    parts.push(t("deployments.rateLimitDayValue", { count: deployment.rateLimitPerDay }));
  }
  return parts.length ? parts.join(" · ") : t("deployments.rateLimitNone");
}

function parseLimit(value: string): number | undefined {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseOrigins(value: string): string[] {
  const seen = new Set<string>();
  for (const line of value.split(/[\r\n,]+/)) {
    const origin = line.trim().toLowerCase().replace(/\/+$/, "");
    if (origin) seen.add(origin);
  }
  return [...seen].slice(0, 20);
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
