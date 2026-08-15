"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useT } from "@/components/IntlProviderClient";
import {
  AgentFactoryApiError,
  createKnowledgeBase,
  deleteKnowledgeBase,
  fetchDocuments,
  fetchKnowledgeBases,
  fetchRepository,
  KnowledgeBase,
  StoredDocument
} from "@/lib/agent-factory-api";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export default function KnowledgeBasesPage() {
  const t = useT();
  const { locale } = useLocale();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [baseToDelete, setBaseToDelete] = useState<KnowledgeBase | null>(null);
  const [error, setError] = useState<unknown>(null);

  const storedDocuments = useMemo(
    () => documents.filter((document) => document.status === "STORED"),
    [documents]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const repository = await fetchRepository();
      if (repository.status !== "ACTIVE") {
        setDocuments([]);
        setKnowledgeBases([]);
        return;
      }
      const [currentDocuments, currentKnowledgeBases] = await Promise.all([
        fetchDocuments(),
        fetchKnowledgeBases()
      ]);
      setDocuments(currentDocuments);
      setKnowledgeBases(currentKnowledgeBases);
    } catch (requestError) {
      if (requestError instanceof AgentFactoryApiError && requestError.status === 404) {
        setDocuments([]);
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
      const created = await createKnowledgeBase({
        name: name.trim(),
        description: description.trim(),
        documentDriveFileIds: selectedDocuments
      });
      setKnowledgeBases((current) => [created, ...current]);
      setName("");
      setDescription("");
      setSelectedDocuments([]);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!baseToDelete) return;
    setDeletingId(baseToDelete.id);
    setError(null);
    try {
      await deleteKnowledgeBase(baseToDelete.id);
      setKnowledgeBases((current) => current.filter((item) => item.id !== baseToDelete.id));
      setBaseToDelete(null);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setDeletingId(null);
    }
  }

  function toggleDocument(driveFileId: string) {
    setSelectedDocuments((current) => current.includes(driveFileId)
      ? current.filter((item) => item !== driveFileId)
      : [...current, driveFileId]);
  }

  if (loading) {
    return <section className="loading-card" role="status"><span className="spinner" aria-hidden="true" />{t("knowledge.loading")}</section>;
  }

  return (
    <div className="page-grid">
      <section className="intro-card">
        <div>
          <span className="eyebrow blue">{t("knowledge.phase")}</span>
          <h2>{t("knowledge.title")}</h2>
          <p>{t("knowledge.description")}</p>
        </div>
        <span className="phase-badge">{t("knowledge.statusDraft")}</span>
      </section>

      {error ? <div className="alert error" role="alert"><strong>{t("operation.failedTitle")}</strong><span>{messageOf(error, t)}</span></div> : null}

      <section className="knowledge-layout">
        <form className="knowledge-form" onSubmit={submit}>
          <div>
            <span className="eyebrow">{t("knowledge.createEyebrow")}</span>
            <h2>{t("knowledge.createTitle")}</h2>
            <p>{t("knowledge.createDescription")}</p>
          </div>
          <label className="form-field">
            <span>{t("knowledge.nameLabel")}</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("knowledge.namePlaceholder")} />
          </label>
          <label className="form-field">
            <span className="field-label">
              {t("knowledge.descriptionLabel")}
              <span className="field-help" tabIndex={0} aria-label={t("knowledge.descriptionPlaceholder")} title={t("knowledge.descriptionPlaceholder")}>?</span>
            </span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("knowledge.descriptionPlaceholder")} />
          </label>
          <div className="document-picker">
            <div>
              <span>{t("knowledge.documentsLabel")}</span>
              <small>{t("knowledge.documentsHelp")}</small>
            </div>
            {storedDocuments.length ? storedDocuments.map((document) => (
              <label className="document-option" key={document.driveFileId}>
                <input
                  type="checkbox"
                  checked={selectedDocuments.includes(document.driveFileId)}
                  onChange={() => toggleDocument(document.driveFileId)}
                />
                <span><strong>{document.name}</strong><small>{formatBytes(document.sizeBytes, locale, t)}</small></span>
              </label>
            )) : <p className="muted-copy">{t("knowledge.noDocuments")}</p>}
          </div>
          <button className="primary-button" type="submit" disabled={saving || !name.trim()}>
            {saving ? t("knowledge.creating") : t("knowledge.createAction")}
          </button>
        </form>

        <section className="knowledge-list">
          <div className="section-heading">
            <div>
              <span className="eyebrow blue">{t("knowledge.inventory")}</span>
              <h2>{t("knowledge.listTitle")}</h2>
              <p className="section-description">{t("knowledge.listDescription")}</p>
            </div>
            <span className="count-badge">{t(knowledgeBases.length === 1 ? "knowledge.count.one" : "knowledge.count.other", { count: knowledgeBases.length })}</span>
          </div>
          {knowledgeBases.length ? (
            <div className="knowledge-items">
              {knowledgeBases.map((base) => (
                <article className="knowledge-item" key={base.id}>
                  <div>
                    <span className="status-badge stored">{t(`knowledge.status.${base.status.toLowerCase()}`)}</span>
                    <h3>{base.name}</h3>
                    <p>{base.description || t("knowledge.noDescription")}</p>
                    <small>{t("knowledge.updatedAt", { date: formatDate(base.updatedAt, locale) })}</small>
                  </div>
                  <div className="knowledge-meta">
                    <strong>{t("knowledge.documentCount", { count: base.documentCount })}</strong>
                    <span>{base.documentNames.slice(0, 3).join(", ") || t("knowledge.noLinkedDocuments")}</span>
                    <button className="icon-button danger" type="button" onClick={() => setBaseToDelete(base)} disabled={deletingId === base.id} aria-label={t("knowledge.delete", { name: base.name })} title={t("knowledge.delete", { name: base.name })}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state compact"><span aria-hidden="true">0</span><strong>{t("knowledge.emptyTitle")}</strong><p>{t("knowledge.emptyDescription")}</p></div>
          )}
        </section>
      </section>
      {baseToDelete ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deletingId) setBaseToDelete(null); }}>
          <section className="confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-knowledge-title" aria-describedby="delete-knowledge-description">
            <span className="confirmation-icon" aria-hidden="true">!</span>
            <h2 id="delete-knowledge-title">{t("knowledge.deleteDialog.title")}</h2>
            <p id="delete-knowledge-description">{t("knowledge.deleteDialog.description", { name: baseToDelete.name })}</p>
            <div className="confirmation-actions">
              <button className="secondary-button" type="button" onClick={() => setBaseToDelete(null)} disabled={deletingId === baseToDelete.id}>{t("common.cancel")}</button>
              <button className="danger-button" type="button" onClick={remove} disabled={deletingId === baseToDelete.id}>{deletingId === baseToDelete.id ? t("knowledge.deleting") : t("knowledge.deleteAction")}</button>
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

function formatBytes(bytes: number, locale: string, t: Translate): string {
  if (!bytes) return t("common.notAvailable");
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: index === 0 ? 0 : 1 }).format(value)} ${units[index]}`;
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
