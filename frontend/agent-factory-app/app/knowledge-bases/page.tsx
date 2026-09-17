"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useT } from "@/components/IntlProviderClient";
import {
  AgentFactoryApiError,
  createKnowledgeBase,
  deleteKnowledgeBase,
  deleteKnowledgeBaseDocument,
  downloadKnowledgeBaseDocument,
  fetchKnowledgeBaseDocuments,
  fetchKnowledgeBases,
  fetchRepository,
  KnowledgeBase,
  StoredDocument,
  updateKnowledgeBase,
  uploadKnowledgeBaseDocument
} from "@/lib/agent-factory-api";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export default function KnowledgeBasesPage() {
  const t = useT();
  const { locale } = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [expandedBaseId, setExpandedBaseId] = useState<string | null>(null);
  const [documentsByBase, setDocumentsByBase] = useState<Record<string, StoredDocument[]>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingBaseId, setUploadingBaseId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busyFileId, setBusyFileId] = useState<string | null>(null);
  const [baseToDelete, setBaseToDelete] = useState<KnowledgeBase | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<{ baseId: string; document: StoredDocument } | null>(null);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const repository = await fetchRepository();
      if (repository.status !== "ACTIVE") {
        setKnowledgeBases([]);
        return;
      }
      setKnowledgeBases(await fetchKnowledgeBases());
    } catch (requestError) {
      if (requestError instanceof AgentFactoryApiError && requestError.status === 404) {
        setKnowledgeBases([]);
      } else {
        setError(requestError);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(load, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const loadDocuments = useCallback(async (baseId: string) => {
    try {
      const docs = await fetchKnowledgeBaseDocuments(baseId);
      setDocumentsByBase((current) => ({ ...current, [baseId]: docs }));
    } catch (requestError) {
      setError(requestError);
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { name: name.trim(), description: description.trim() };
      if (editingId) {
        const updated = await updateKnowledgeBase(editingId, payload);
        setKnowledgeBases((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await createKnowledgeBase(payload);
        setKnowledgeBases((current) => [created, ...current]);
        setExpandedBaseId(created.id);
      }
      resetForm();
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  function edit(base: KnowledgeBase) {
    setEditingId(base.id);
    setName(base.name);
    setDescription(base.description ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setDescription("");
  }

  async function remove() {
    if (!baseToDelete) return;
    setDeletingId(baseToDelete.id);
    setError(null);
    try {
      await deleteKnowledgeBase(baseToDelete.id);
      setKnowledgeBases((current) => current.filter((item) => item.id !== baseToDelete.id));
      setExpandedBaseId((current) => (current === baseToDelete.id ? null : current));
      setBaseToDelete(null);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setDeletingId(null);
    }
  }

  function toggleBase(baseId: string) {
    setExpandedBaseId((current) => {
      const next = current === baseId ? null : baseId;
      if (next && !documentsByBase[next]) loadDocuments(next);
      return next;
    });
  }

  async function onFilePicked(baseId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadingBaseId(baseId);
    setError(null);
    try {
      await uploadKnowledgeBaseDocument(baseId, file);
      await loadDocuments(baseId);
      setKnowledgeBases((current) =>
        current.map((item) => (item.id === baseId ? { ...item, documentCount: item.documentCount + 1 } : item))
      );
    } catch (requestError) {
      setError(requestError);
    } finally {
      setUploadingBaseId(null);
    }
  }

  async function removeDocument() {
    if (!documentToDelete) return;
    const { baseId, document } = documentToDelete;
    setBusyFileId(document.storageObjectKey);
    setError(null);
    try {
      await deleteKnowledgeBaseDocument(baseId, document.storageObjectKey);
      setDocumentsByBase((current) => ({
        ...current,
        [baseId]: (current[baseId] ?? []).filter((item) => item.storageObjectKey !== document.storageObjectKey)
      }));
      setKnowledgeBases((current) =>
        current.map((item) => (item.id === baseId ? { ...item, documentCount: Math.max(0, item.documentCount - 1) } : item))
      );
      setDocumentToDelete(null);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setBusyFileId(null);
    }
  }

  async function download(baseId: string, document: StoredDocument) {
    setBusyFileId(document.storageObjectKey);
    try {
      await downloadKnowledgeBaseDocument(baseId, document);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setBusyFileId(null);
    }
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
      </section>

      {error ? <div className="alert error" role="alert"><strong>{t("operation.failedTitle")}</strong><span>{messageOf(error, t)}</span></div> : null}

      <section className="knowledge-layout">
        <form className="knowledge-form" onSubmit={submit}>
          <div>
            <span className="eyebrow">{t(editingId ? "knowledge.editEyebrow" : "knowledge.createEyebrow")}</span>
            <h2>{t(editingId ? "knowledge.editTitle" : "knowledge.createTitle")}</h2>
            <p>{t("knowledge.createDescription")}</p>
          </div>
          <label className="form-field">
            <span className="field-label">{t("knowledge.nameLabel")} <span className="req" aria-hidden="true">*</span></span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("knowledge.namePlaceholder")} maxLength={120} required aria-required="true" />
          </label>
          <label className="form-field">
            <span className="field-label">
              {t("knowledge.descriptionLabel")}
              <span className="field-help" tabIndex={0} aria-label={t("knowledge.descriptionPlaceholder")} title={t("knowledge.descriptionPlaceholder")}>?</span>
            </span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("knowledge.descriptionPlaceholder")} maxLength={1000} />
          </label>
          <p className="form-required-note">{t("common.requiredFields")}</p>
          <div className="form-actions">
            {editingId ? <button className="secondary-button" type="button" onClick={resetForm} disabled={saving}>{t("common.cancel")}</button> : null}
            <button className="primary-button" type="submit" disabled={saving || !name.trim()}>
              {saving ? t("knowledge.creating") : t(editingId ? "knowledge.updateAction" : "knowledge.createAction")}
            </button>
          </div>
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
              {knowledgeBases.map((base) => {
                const expanded = expandedBaseId === base.id;
                const docs = documentsByBase[base.id] ?? [];
                return (
                  <article className={`knowledge-item base-inventory-item ${expanded ? "expanded" : "collapsed"}`} key={base.id}>
                    <div className="agent-inventory-header">
                      <button
                        className="agent-toggle"
                        type="button"
                        onClick={() => toggleBase(base.id)}
                        aria-expanded={expanded}
                        aria-controls={`base-panel-${base.id}`}
                      >
                        <span className="agent-toggle-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24"><path d="m8 10 4 4 4-4" /></svg>
                        </span>
                        <span className="agent-toggle-copy">
                          <span className="agent-lifecycle-badge created-unindexed">{t(`knowledge.status.${base.status.toLowerCase()}`)}</span>
                          <strong>{base.name}</strong>
                          <small>{base.description || t("knowledge.noDescription")}</small>
                        </span>
                      </button>
                      <div className="agent-collapsed-meta">
                        <strong>{t("knowledge.documentCount", { count: base.documentCount })}</strong>
                        <span>{t("knowledge.updatedAt", { date: formatDate(base.updatedAt, locale) })}</span>
                      </div>
                    </div>

                    {expanded ? (
                      <div className="base-expanded-panel" id={`base-panel-${base.id}`}>
                        <div className="base-docs-toolbar">
                          <strong>{t("knowledge.documentsLabel")}</strong>
                          <div className="item-actions">
                            <input
                              ref={fileInputRef}
                              type="file"
                              hidden
                              id={`kb-file-${base.id}`}
                              onChange={(event) => onFilePicked(base.id, event)}
                            />
                            <label className="small-action" htmlFor={`kb-file-${base.id}`}>
                              {uploadingBaseId === base.id ? t("knowledge.uploading") : t("knowledge.uploadAction")}
                            </label>
                            <button className="icon-button" type="button" onClick={() => edit(base)} aria-label={t("knowledge.edit", { name: base.name })} title={t("knowledge.edit", { name: base.name })}>
                              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                            </button>
                            <button className="icon-button danger" type="button" onClick={() => setBaseToDelete(base)} disabled={deletingId === base.id} aria-label={t("knowledge.delete", { name: base.name })} title={t("knowledge.delete", { name: base.name })}>
                              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>
                            </button>
                          </div>
                        </div>
                        {docs.length ? (
                          <ul className="base-docs-list">
                            {docs.map((document) => (
                              <li key={document.storageObjectKey}>
                                <span>
                                  <strong>{document.name}</strong>
                                  <small>{formatBytes(document.sizeBytes, locale, t)} · {t(`knowledge.docStatus.${document.status.toLowerCase()}`)}</small>
                                </span>
                                <span className="item-actions">
                                  <button className="link-button" type="button" onClick={() => download(base.id, document)} disabled={busyFileId === document.storageObjectKey}>{t("knowledge.download")}</button>
                                  <button className="link-button" type="button" onClick={() => setDocumentToDelete({ baseId: base.id, document })} disabled={busyFileId === document.storageObjectKey}>{t("knowledge.removeDocument")}</button>
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="muted-copy">{t("knowledge.noDocuments")}</p>
                        )}
                      </div>
                    ) : null}
                  </article>
                );
              })}
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
      {documentToDelete ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busyFileId) setDocumentToDelete(null); }}>
          <section className="confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-document-title" aria-describedby="delete-document-description">
            <span className="confirmation-icon" aria-hidden="true">!</span>
            <h2 id="delete-document-title">{t("knowledge.deleteDocumentDialog.title")}</h2>
            <p id="delete-document-description">{t("knowledge.deleteDocumentDialog.description", { name: documentToDelete.document.name })}</p>
            <div className="confirmation-actions">
              <button className="secondary-button" type="button" onClick={() => setDocumentToDelete(null)} disabled={!!busyFileId}>{t("common.cancel")}</button>
              <button className="danger-button" type="button" onClick={removeDocument} disabled={!!busyFileId}>{busyFileId ? t("knowledge.deleting") : t("knowledge.deleteAction")}</button>
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
