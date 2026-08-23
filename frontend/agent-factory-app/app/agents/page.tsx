"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocale, useT } from "@/components/IntlProviderClient";
import {
  AgentDefinition,
  AgentFactoryApiError,
  AgentIndexingJob,
  AgentTestResponse,
  createAgent,
  createAgentIndexingJobs,
  deleteAgent,
  fetchAgentIndexingJobs,
  fetchAgents,
  fetchKnowledgeBases,
  fetchRepository,
  KnowledgeBase,
  publishAgent,
  testAgent,
  updateAgent
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
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<AgentDefinition | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [indexingId, setIndexingId] = useState<string | null>(null);
  const [watchedIndexingAgentIds, setWatchedIndexingAgentIds] = useState<string[]>([]);
  const [indexingJobsByAgent, setIndexingJobsByAgent] = useState<Record<string, AgentIndexingJob[]>>({});
  const [testingAgentId, setTestingAgentId] = useState<string | null>(null);
  const [testQuestions, setTestQuestions] = useState<Record<string, string>>({});
  const [testResponses, setTestResponses] = useState<Record<string, AgentTestResponse>>({});
  const [error, setError] = useState<unknown>(null);

  const refreshIndexingJobs = useCallback(async (currentAgents: AgentDefinition[]) => {
    const jobs = await Promise.all(
      currentAgents
        .filter((agent) => agent.status === "READY")
        .map(async (agent) => [agent.id, await fetchAgentIndexingJobs(agent.id)] as const)
    );
    setIndexingJobsByAgent(Object.fromEntries(jobs));
  }, []);

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
      await refreshIndexingJobs(currentAgents);
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
  }, [refreshIndexingJobs]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      load();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  useEffect(() => {
    const activeAgentIds = agents
      .filter((agent) => agent.status === "READY")
      .filter((agent) => {
        const jobs = indexingJobsByAgent[agent.id];
        return watchedIndexingAgentIds.includes(agent.id)
          || jobs?.some((job) => job.status === "PENDING" || job.status === "PROCESSING");
      });
    if (!activeAgentIds.length) return undefined;

    let cancelled = false;
    async function pollIndexingJobs() {
      const responses = await Promise.all(
        activeAgentIds.map(async (agent) => [agent.id, await fetchAgentIndexingJobs(agent.id)] as const)
      );
      if (cancelled) return;
      setIndexingJobsByAgent((current) => ({ ...current, ...Object.fromEntries(responses) }));
      const completedAgentIds = activeAgentIds
        .filter((agent) => isKnowledgeUpToDate(agent, responses.find(([id]) => id === agent.id)?.[1]))
        .map((agent) => agent.id);
      if (completedAgentIds.length) {
        setWatchedIndexingAgentIds((current) => current.filter((id) => !completedAgentIds.includes(id)));
      }
    }

    const interval = window.setInterval(() => {
      pollIndexingJobs().catch((requestError) => setError(requestError));
    }, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [agents, indexingJobsByAgent, watchedIndexingAgentIds]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        knowledgeBaseIds: selectedBases
      };
      if (editingAgentId) {
        const updated = await updateAgent(editingAgentId, payload);
        setAgents((current) => current.map((agent) => agent.id === editingAgentId ? updated : agent));
      } else {
        const created = await createAgent(payload);
        setAgents((current) => [created, ...current]);
      }
      resetForm();
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  function edit(agent: AgentDefinition) {
    setEditingAgentId(agent.id);
    setName(agent.name);
    setDescription(agent.description ?? "");
    setInstructions(agent.instructions ?? "");
    setSelectedBases(agent.knowledgeBaseIds ?? []);
    setError(null);
  }

  function resetForm() {
    setEditingAgentId(null);
    setName("");
    setDescription("");
    setInstructions("");
    setSelectedBases([]);
  }

  async function remove() {
    if (!agentToDelete) return;
    setDeletingId(agentToDelete.id);
    setError(null);
    try {
      await deleteAgent(agentToDelete.id);
      setAgents((current) => current.filter((item) => item.id !== agentToDelete.id));
      setAgentToDelete(null);
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
      setIndexingJobsByAgent((current) => ({ ...current, [agent.id]: [] }));
    } catch (requestError) {
      setError(requestError);
    } finally {
      setPublishingId(null);
    }
  }

  async function indexKnowledge(agent: AgentDefinition) {
    setIndexingId(agent.id);
    setError(null);
    try {
      const response = await createAgentIndexingJobs(agent.id);
      setIndexingJobsByAgent((current) => ({ ...current, [agent.id]: response.jobs }));
      setWatchedIndexingAgentIds((current) => current.includes(agent.id) ? current : [...current, agent.id]);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setIndexingId(null);
    }
  }

  async function test(agent: AgentDefinition) {
    const question = (testQuestions[agent.id] ?? "").trim();
    if (!question) return;
    setTestingAgentId(agent.id);
    setError(null);
    try {
      const response = await testAgent(agent.id, question);
      setTestResponses((current) => ({ ...current, [agent.id]: response }));
      setTestQuestions((current) => ({ ...current, [agent.id]: "" }));
    } catch (requestError) {
      setError(requestError);
    } finally {
      setTestingAgentId(null);
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
            <h2>{t(editingAgentId ? "agents.editTitle" : "agents.createTitle")}</h2>
            <p>{t(editingAgentId ? "agents.editDescription" : "agents.createDescription")}</p>
          </div>
          <label className="form-field">
            <span className="field-label">
              {t("agents.nameLabel")}
              <span className="field-help" tabIndex={0} aria-label={t("agents.namePlaceholder")} title={t("agents.namePlaceholder")}>?</span>
            </span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("agents.namePlaceholder")} />
          </label>
          <label className="form-field">
            <span className="field-label">
              {t("agents.descriptionLabel")}
              <span className="field-help" tabIndex={0} aria-label={t("agents.descriptionPlaceholder")} title={t("agents.descriptionPlaceholder")}>?</span>
            </span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("agents.descriptionPlaceholder")} />
          </label>
          <label className="form-field">
            <span className="field-label">
              {t("agents.instructionsLabel")}
              <span className="field-help" tabIndex={0} aria-label={t("agents.instructionsPlaceholder")} title={t("agents.instructionsPlaceholder")}>?</span>
            </span>
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
          <div className="form-actions">
            {editingAgentId ? (
              <button className="secondary-button" type="button" onClick={resetForm} disabled={saving}>{t("common.cancel")}</button>
            ) : null}
            <button className="primary-button" type="submit" disabled={saving || !name.trim()}>
              {saving ? t(editingAgentId ? "agents.updating" : "agents.creating") : t(editingAgentId ? "agents.updateAction" : "agents.createAction")}
            </button>
          </div>
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
                <article className={`knowledge-item ${isAgentReadyToTest(agent, indexingJobsByAgent[agent.id]) ? "ready-to-test" : ""}`} key={agent.id}>
                  <div>
                    <span className="status-badge stored">{t(`agents.status.${agent.status.toLowerCase()}`)}</span>
                    <h3>{agent.name}</h3>
                    <p>{agent.description || t("agents.noDescription")}</p>
                    <small>{t(agent.publishedAt ? "agents.publishedAt" : "agents.updatedAt", { date: formatDate(agent.publishedAt ?? agent.updatedAt, locale) })}</small>
                    {isAgentIndexing(agent, indexingJobsByAgent[agent.id]) ? (
                      <div className="agent-indexing-progress" role="status" aria-live="polite">
                        <span className="spinner small" aria-hidden="true" />
                        <div>
                          <strong>{t("agents.indexingProgressTitle")}</strong>
                          <span>{t("agents.indexingProgressDescription")}</span>
                        </div>
                      </div>
                    ) : null}
                    {isAgentReadyToTest(agent, indexingJobsByAgent[agent.id]) ? (
                      <div className="agent-readiness">
                        <strong>{t("agents.readyTitle")}</strong>
                        <span>{t("agents.readyDescription", { documents: indexedDocumentCount(indexingJobsByAgent[agent.id]) })}</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="knowledge-meta">
                    <strong>{t("agents.knowledgeBaseCount", { count: agent.knowledgeBaseCount })}</strong>
                    <span>{agent.knowledgeBaseNames.slice(0, 3).join(", ") || t("agents.noLinkedBases")}</span>
                    {agent.status === "READY" ? (
                      <small className={`indexing-status ${indexingStatus(agent, indexingJobsByAgent[agent.id]).toLowerCase()}`}>
                        {indexingLabel(agent, indexingJobsByAgent[agent.id], t)}
                      </small>
                    ) : null}
                    <div className="item-actions">
                      {agent.status === "DRAFT" ? (
                        <button className="small-action" type="button" onClick={() => publish(agent)} disabled={publishingId === agent.id || agent.knowledgeBaseCount === 0}>
                          {publishingId === agent.id ? t("agents.publishing") : t("agents.publish")}
                        </button>
                      ) : null}
                      {agent.status === "READY" ? (
                        <button
                          className={`small-action ${isKnowledgeUpToDate(agent, indexingJobsByAgent[agent.id]) ? "success-action" : ""}`}
                          type="button"
                          onClick={() => indexKnowledge(agent)}
                          disabled={indexingId === agent.id || agent.knowledgeBaseCount === 0 || isKnowledgeUpToDate(agent, indexingJobsByAgent[agent.id])}
                          title={isKnowledgeUpToDate(agent, indexingJobsByAgent[agent.id]) ? t("agents.indexKnowledgeDisabled") : t("agents.indexKnowledge")}
                        >
                          {indexingId === agent.id
                            ? t("agents.indexingQueued")
                            : isKnowledgeUpToDate(agent, indexingJobsByAgent[agent.id])
                              ? t("agents.indexKnowledgeDone")
                              : t("agents.indexKnowledge")}
                        </button>
                      ) : null}
                      <button className="icon-button" type="button" onClick={() => edit(agent)} disabled={saving && editingAgentId === agent.id} aria-label={t("agents.edit", { name: agent.name })} title={t("agents.edit", { name: agent.name })}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z" /><path d="M13.5 6.5l4 4" /></svg>
                      </button>
                      <button className="icon-button danger" type="button" onClick={() => setAgentToDelete(agent)} disabled={deletingId === agent.id} aria-label={t("agents.delete", { name: agent.name })} title={t("agents.delete", { name: agent.name })}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>
                      </button>
                    </div>
                  </div>
                  {isAgentReadyToTest(agent, indexingJobsByAgent[agent.id]) ? (
                    <div className="agent-test-panel">
                      <div>
                        <strong>{t("agents.testTitle")}</strong>
                        <span>{t("agents.testDescription")}</span>
                      </div>
                      <form className="agent-test-input" onSubmit={(event) => { event.preventDefault(); test(agent); }}>
                        <input
                          value={testQuestions[agent.id] ?? ""}
                          onChange={(event) => setTestQuestions((current) => ({ ...current, [agent.id]: event.target.value }))}
                          placeholder={t("agents.testPlaceholder")}
                        />
                        <button className="small-action" type="submit" disabled={testingAgentId === agent.id || !(testQuestions[agent.id] ?? "").trim()}>
                          {testingAgentId === agent.id ? t("agents.testing") : t("agents.testAction")}
                        </button>
                      </form>
                      {testResponses[agent.id] ? (
                        <div className="agent-test-answer">
                          <span>{t("agents.testAnswerLabel")}</span>
                          <p>{testResponses[agent.id].answer}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state compact"><span aria-hidden="true">0</span><strong>{t("agents.emptyTitle")}</strong><p>{t("agents.emptyDescription")}</p></div>
          )}
        </section>
      </section>
      {agentToDelete ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deletingId) setAgentToDelete(null); }}>
          <section className="confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-agent-title" aria-describedby="delete-agent-description">
            <span className="confirmation-icon" aria-hidden="true">!</span>
            <h2 id="delete-agent-title">{t("agents.deleteDialog.title")}</h2>
            <p id="delete-agent-description">{t("agents.deleteDialog.description", { name: agentToDelete.name })}</p>
            <div className="confirmation-actions">
              <button className="secondary-button" type="button" onClick={() => setAgentToDelete(null)} disabled={deletingId === agentToDelete.id}>{t("common.cancel")}</button>
              <button className="danger-button" type="button" onClick={remove} disabled={deletingId === agentToDelete.id}>{deletingId === agentToDelete.id ? t("agents.deleting") : t("agents.deleteAction")}</button>
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

function indexingStatus(agent: AgentDefinition, jobs: AgentIndexingJob[] | undefined): AgentIndexingJob["status"] | "NOT_REQUESTED" {
  if (agent.status !== "READY") return "NOT_REQUESTED";
  if (!jobs?.length) return "NOT_REQUESTED";
  if (jobs.some((job) => job.status === "FAILED")) return "FAILED";
  if (jobs.some((job) => job.status === "PROCESSING")) return "PROCESSING";
  if (jobs.some((job) => job.status === "PENDING")) return "PENDING";
  return "COMPLETED";
}

function indexingLabel(agent: AgentDefinition, jobs: AgentIndexingJob[] | undefined, t: Translate): string {
  const status = indexingStatus(agent, jobs);
  if (status === "COMPLETED") {
    const chunks = jobs?.reduce((total, job) => total + job.chunks, 0) ?? 0;
    const documents = jobs?.reduce((total, job) => total + job.documents, 0) ?? 0;
    if (isKnowledgeUpToDate(agent, jobs)) {
      return t("agents.indexingStatus.upToDate", { documents });
    }
    if (documents > 0 && chunks === 0) {
      return t("agents.indexingStatus.noChunks", { documents });
    }
    return t("agents.indexingStatus.completed", { chunks });
  }
  return t(`agents.indexingStatus.${status.toLowerCase()}`);
}

function isAgentReadyToTest(agent: AgentDefinition, jobs: AgentIndexingJob[] | undefined): boolean {
  return agent.status === "READY" && isKnowledgeUpToDate(agent, jobs);
}

function isAgentIndexing(agent: AgentDefinition, jobs: AgentIndexingJob[] | undefined): boolean {
  if (agent.status !== "READY") return false;
  const status = indexingStatus(agent, jobs);
  return status === "PENDING" || status === "PROCESSING";
}

function indexedDocumentCount(jobs: AgentIndexingJob[] | undefined): number {
  return jobs?.reduce((total, job) => total + job.documents, 0) ?? 0;
}

function isKnowledgeUpToDate(agent: AgentDefinition, jobs: AgentIndexingJob[] | undefined): boolean {
  if (agent.status !== "READY" || indexingStatus(agent, jobs) !== "COMPLETED") return false;
  const chunks = jobs?.reduce((total, job) => total + job.chunks, 0) ?? 0;
  if (chunks <= 0) return false;
  const referenceDate = new Date(agent.publishedAt ?? agent.updatedAt).getTime();
  if (!Number.isFinite(referenceDate)) return true;
  return jobs?.every((job) => {
    const finishedDate = job.finished_at ? new Date(job.finished_at).getTime() : 0;
    return finishedDate >= referenceDate;
  }) ?? false;
}
