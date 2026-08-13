"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocale, useT } from "@/components/IntlProviderClient";
import {
  AgentDefinition,
  AgentFactoryApiError,
  createAgent,
  deleteAgent,
  fetchAgents,
  fetchKnowledgeBases,
  fetchRepository,
  KnowledgeBase,
  publishAgent
} from "@/lib/agent-factory-api";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export default function AgentsPage() {
  const t = useT();
  const { locale } = useLocale();
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedBases, setSelectedBases] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const repository = await fetchRepository();
      if (repository.status !== "ACTIVE") {
        setAgents([]);
        setKnowledgeBases([]);
        return;
      }
      const [currentAgents, currentKnowledgeBases] = await Promise.all([
        fetchAgents(),
        fetchKnowledgeBases()
      ]);
      setAgents(currentAgents);
      setKnowledgeBases(currentKnowledgeBases);
    } catch (requestError) {
      if (requestError instanceof AgentFactoryApiError && requestError.status === 404) {
        setAgents([]);
        setKnowledgeBases([]);
      } else {
        setError(requestError);
      }
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
      const created = await createAgent({
        name: name.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        knowledgeBaseIds: selectedBases
      });
      setAgents((current) => [created, ...current]);
      setName("");
      setDescription("");
      setInstructions("");
      setSelectedBases([]);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  async function remove(agent: AgentDefinition) {
    setDeletingId(agent.id);
    setError(null);
    try {
      await deleteAgent(agent.id);
      setAgents((current) => current.filter((item) => item.id !== agent.id));
    } catch (requestError) {
      setError(requestError);
    } finally {
      setDeletingId(null);
    }
  }

  async function publish(agent: AgentDefinition) {
    setPublishingId(agent.id);
    setError(null);
    try {
      const published = await publishAgent(agent.id);
      setAgents((current) => current.map((item) => item.id === agent.id ? published : item));
    } catch (requestError) {
      setError(requestError);
    } finally {
      setPublishingId(null);
    }
  }

  function toggleBase(id: string) {
    setSelectedBases((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  }

  if (loading) {
    return <section className="loading-card" role="status"><span className="spinner" aria-hidden="true" />{t("agents.loading")}</section>;
  }

  return (
    <div className="page-grid">
      <section className="intro-card">
        <div>
          <span className="eyebrow blue">{t("agents.phase")}</span>
          <h2>{t("agents.title")}</h2>
          <p>{t("agents.description")}</p>
        </div>
        <span className="phase-badge">{t("agents.statusDraft")}</span>
      </section>

      {error ? <div className="alert error" role="alert"><strong>{t("operation.failedTitle")}</strong><span>{messageOf(error, t)}</span></div> : null}

      <section className="knowledge-layout">
        <form className="knowledge-form" onSubmit={submit}>
          <div>
            <span className="eyebrow">{t("agents.createEyebrow")}</span>
            <h2>{t("agents.createTitle")}</h2>
            <p>{t("agents.createDescription")}</p>
          </div>
          <label className="form-field">
            <span>{t("agents.nameLabel")}</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("agents.namePlaceholder")} />
          </label>
          <label className="form-field">
            <span>{t("agents.descriptionLabel")}</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("agents.descriptionPlaceholder")} />
          </label>
          <label className="form-field">
            <span>{t("agents.instructionsLabel")}</span>
            <textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder={t("agents.instructionsPlaceholder")} />
          </label>
          <div className="document-picker">
            <div>
              <span>{t("agents.knowledgeBasesLabel")}</span>
              <small>{t("agents.knowledgeBasesHelp")}</small>
            </div>
            {knowledgeBases.length ? knowledgeBases.map((base) => (
              <label className="document-option" key={base.id}>
                <input
                  type="checkbox"
                  checked={selectedBases.includes(base.id)}
                  onChange={() => toggleBase(base.id)}
                />
                <span><strong>{base.name}</strong><small>{t("agents.baseDocumentCount", { count: base.documentCount })}</small></span>
              </label>
            )) : <p className="muted-copy">{t("agents.noKnowledgeBases")}</p>}
          </div>
          <button className="primary-button" type="submit" disabled={saving || !name.trim()}>
            {saving ? t("agents.creating") : t("agents.createAction")}
          </button>
        </form>

        <section className="knowledge-list">
          <div className="section-heading">
            <div>
              <span className="eyebrow blue">{t("agents.inventory")}</span>
              <h2>{t("agents.listTitle")}</h2>
              <p className="section-description">{t("agents.listDescription")}</p>
              <p className="section-description subtle">{t("agents.publishHelp")}</p>
            </div>
            <span className="count-badge">{t(agents.length === 1 ? "agents.count.one" : "agents.count.other", { count: agents.length })}</span>
          </div>
          {agents.length ? (
            <div className="knowledge-items">
              {agents.map((agent) => (
                <article className="knowledge-item" key={agent.id}>
                  <div>
                    <span className="status-badge stored">{t(`agents.status.${agent.status.toLowerCase()}`)}</span>
                    <h3>{agent.name}</h3>
                    <p>{agent.description || t("agents.noDescription")}</p>
                    <small>{t(agent.publishedAt ? "agents.publishedAt" : "agents.updatedAt", { date: formatDate(agent.publishedAt ?? agent.updatedAt, locale) })}</small>
                  </div>
                  <div className="knowledge-meta">
                    <strong>{t("agents.knowledgeBaseCount", { count: agent.knowledgeBaseCount })}</strong>
                    <span>{agent.knowledgeBaseNames.slice(0, 3).join(", ") || t("agents.noLinkedBases")}</span>
                    {agent.status === "DRAFT" ? (
                      <button className="small-action" type="button" onClick={() => publish(agent)} disabled={publishingId === agent.id || agent.knowledgeBaseCount === 0}>
                        {publishingId === agent.id ? t("agents.publishing") : t("agents.publish")}
                      </button>
                    ) : null}
                    <button className="icon-button danger" type="button" onClick={() => remove(agent)} disabled={deletingId === agent.id} aria-label={t("agents.delete", { name: agent.name })} title={t("agents.delete", { name: agent.name })}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state compact"><span aria-hidden="true">0</span><strong>{t("agents.emptyTitle")}</strong><p>{t("agents.emptyDescription")}</p></div>
          )}
        </section>
      </section>
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
