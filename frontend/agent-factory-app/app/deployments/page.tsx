"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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
  updateDeployment
} from "@/lib/agent-factory-api";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

type FormState = {
  agentId: string;
  name: string;
  channelType: DeploymentChannelType;
  deploymentSlug: string;
  status: DeploymentStatus;
  publicUrl: string;
  apiKey: string;
};

const emptyForm: FormState = {
  agentId: "",
  name: "",
  channelType: "WEB_CHAT",
  deploymentSlug: "",
  status: "ACTIVE",
  publicUrl: "",
  apiKey: ""
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
  const [error, setError] = useState<unknown>(null);

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
        publicUrl: form.publicUrl.trim(),
        apiKey: form.apiKey.trim() || undefined
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
      publicUrl: deployment.publicUrl || "",
      apiKey: ""
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
              {t("deployments.agentLabel")}
              <span className="field-help" tabIndex={0} aria-label={t("deployments.agentHelp")} title={t("deployments.agentHelp")}>?</span>
            </span>
            <select value={form.agentId} onChange={(event) => setField("agentId", event.target.value)}>
              <option value="">{t("deployments.agentPlaceholder")}</option>
              {readyAgents.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
          </label>
          {!readyAgents.length ? <p className="muted-copy">{t("deployments.noReadyAgents")}</p> : null}
          <label className="form-field">
            <span className="field-label">
              {t("deployments.nameLabel")}
              <span className="field-help" tabIndex={0} aria-label={t("deployments.nameHelp")} title={t("deployments.nameHelp")}>?</span>
            </span>
            <input value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder={t("deployments.namePlaceholder")} />
          </label>
          <label className="form-field">
            <span className="field-label">
              {t("deployments.channelLabel")}
              <span className="field-help" tabIndex={0} aria-label={t("deployments.channelHelp")} title={t("deployments.channelHelp")}>?</span>
            </span>
            <select value={form.channelType} onChange={(event) => setField("channelType", event.target.value as DeploymentChannelType)}>
              <option value="WEB_CHAT">{t("deployments.channel.web_chat")}</option>
              <option value="API">{t("deployments.channel.api")}</option>
              <option value="INTERNAL_TEST">{t("deployments.channel.internal_test")}</option>
            </select>
          </label>
          <label className="form-field">
            <span className="field-label">
              {t("deployments.slugLabel")}
              <span className="field-help" tabIndex={0} aria-label={t("deployments.slugHelp")} title={t("deployments.slugHelp")}>?</span>
            </span>
            <input value={form.deploymentSlug} onChange={(event) => setField("deploymentSlug", slugify(event.target.value))} placeholder={t("deployments.slugPlaceholder")} />
          </label>
          <label className="form-field">
            <span className="field-label">
              {t("deployments.publicUrlLabel")}
              <span className="field-help" tabIndex={0} aria-label={t("deployments.publicUrlHelp")} title={t("deployments.publicUrlHelp")}>?</span>
            </span>
            <input value={form.publicUrl} onChange={(event) => setField("publicUrl", event.target.value)} placeholder={t("deployments.publicUrlPlaceholder")} />
          </label>
          <label className="form-field">
            <span className="field-label">
              {t("deployments.apiKeyLabel")}
              <span className="field-help" tabIndex={0} aria-label={t("deployments.apiKeyHelp")} title={t("deployments.apiKeyHelp")}>?</span>
            </span>
            <input value={form.apiKey} onChange={(event) => setField("apiKey", event.target.value)} placeholder={editingId ? t("deployments.apiKeyEditPlaceholder") : t("deployments.apiKeyPlaceholder")} />
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
                    <div className="deployment-endpoint">
                      <span>{t("deployments.endpointLabel")}</span>
                      <code>{deployment.publicUrl || `/${deployment.deploymentSlug}`}</code>
                    </div>
                  </div>
                  <div className="knowledge-meta deployment-meta">
                    <strong>{t(`deployments.channel.${deployment.channelType.toLowerCase()}`)}</strong>
                    <span>{deployment.deploymentSlug}</span>
                    <span>{deployment.hasApiKey ? t("deployments.apiKeyConfigured") : t("deployments.apiKeyNotConfigured")}</span>
                    <div className="item-actions">
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

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
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
