"use client";

import { DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useT } from "@/components/IntlProviderClient";
import {
  AgentFactoryApiError,
  deleteDocument,
  downloadDocument,
  DriveConnection,
  fetchDriveConnection,
  fetchDocuments,
  fetchRepository,
  provisionRepository,
  RepositoryStatus,
  startDriveConnection,
  StoredDocument,
  uploadDocument
} from "@/lib/agent-factory-api";

type UploadResult = {
  name: string;
  state: "uploading" | "stored" | "failed";
  error?: unknown;
};

type Translate = (key: string, vars?: Record<string, string | number>) => string;
type DocumentTypeFilter = "all" | "pdf" | "document" | "presentation" | "spreadsheet" | "text" | "web";
type DocumentSort = "modified-desc" | "modified-asc" | "name-asc";

const ACCEPTED_EXTENSIONS = ".txt,.pdf,.docx,.xlsx,.pptx,.csv,.url,.html,.htm";

export default function DocumentsPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useT();
  const { locale } = useLocale();
  const [repository, setRepository] = useState<RepositoryStatus | null>(null);
  const [driveConnection, setDriveConnection] = useState<DriveConnection | null>(null);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [connectingDrive, setConnectingDrive] = useState(false);
  const [connectionNotice, setConnectionNotice] = useState<"connected" | "error" | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadResult[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<DocumentTypeFilter>("all");
  const [sort, setSort] = useState<DocumentSort>("modified-desc");
  const [documentToDelete, setDocumentToDelete] = useState<StoredDocument | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshingDocuments, setRefreshingDocuments] = useState(false);

  const visibleDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    return documents
      .filter((document) => !normalizedQuery || document.name.toLocaleLowerCase(locale).includes(normalizedQuery))
      .filter((document) => typeFilter === "all" || categoryOf(document) === typeFilter)
      .toSorted((left, right) => {
        if (sort === "name-asc") return left.name.localeCompare(right.name, locale);
        const difference = new Date(left.modifiedAt).getTime() - new Date(right.modifiedAt).getTime();
        return sort === "modified-asc" ? difference : -difference;
      });
  }, [documents, locale, query, sort, typeFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const connection = await fetchDriveConnection();
      setDriveConnection(connection);
      if (connection.status !== "CONNECTED") {
        setRepository(null);
        setDocuments([]);
        return;
      }
      const currentRepository = await fetchRepository();
      setRepository(currentRepository);
      if (currentRepository.status === "ACTIVE") {
        setDocuments(await fetchDocuments());
      }
    } catch (requestError) {
      if (requestError instanceof AgentFactoryApiError && requestError.status === 404) {
        setRepository(null);
        setDocuments([]);
      } else {
        setError(requestError);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("drive");
    if (result === "connected" || result === "error") {
      setConnectionNotice(result);
      window.history.replaceState({}, "", window.location.pathname);
    }
    load();
  }, [load]);

  async function connectDrive() {
    setConnectingDrive(true);
    setError(null);
    setConnectionNotice(null);
    try {
      const result = await startDriveConnection();
      window.location.assign(result.authorizationUrl);
    } catch (requestError) {
      setError(requestError);
      setConnectingDrive(false);
    }
  }

  async function provision() {
    setProvisioning(true);
    setError(null);
    try {
      const result = await provisionRepository();
      setRepository(result);
      setDocuments(await fetchDocuments());
    } catch (requestError) {
      setError(requestError);
      await load();
    } finally {
      setProvisioning(false);
    }
  }

  async function uploadFiles(files: File[]) {
    if (!files.length || repository?.status !== "ACTIVE") return;
    setUploads(files.map((file) => ({ name: file.name, state: "uploading" as const })));
    for (const file of files) {
      try {
        await uploadDocument(file);
        setUploads((current) => current.map((item) => item.name === file.name ? { ...item, state: "stored" } : item));
      } catch (requestError) {
        setUploads((current) => current.map((item) => item.name === file.name
          ? { ...item, state: "failed", error: requestError }
          : item));
      }
    }
    try {
      setDocuments(await fetchDocuments());
    } catch (requestError) {
      setError(requestError);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    uploadFiles(Array.from(event.dataTransfer.files));
  }

  async function download(document: StoredDocument) {
    try {
      await downloadDocument(document);
    } catch (requestError) {
      setError(requestError);
    }
  }

  async function removeDocument() {
    if (!documentToDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteDocument(documentToDelete);
      setDocuments((current) => current.filter((item) => item.driveFileId !== documentToDelete.driveFileId));
      setDocumentToDelete(null);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setDeleting(false);
    }
  }

  async function refreshDocuments() {
    if (repository?.status !== "ACTIVE") return;
    setRefreshingDocuments(true);
    setError(null);
    try {
      setDocuments(await fetchDocuments());
    } catch (requestError) {
      setError(requestError);
    } finally {
      setRefreshingDocuments(false);
    }
  }

  if (loading) {
    return <section className="loading-card" role="status"><span className="spinner" aria-hidden="true" />{t("repository.loading")}</section>;
  }

  return (
    <div className="page-grid">
      <section className="intro-card">
        <div>
          <span className="eyebrow blue">{t("repository.managed")}</span>
          <h2>{t("repository.introTitle")}</h2>
          <p>{t("repository.introDescription")}</p>
        </div>
        <RepositoryPill connection={driveConnection} t={t} />
      </section>

      {connectionNotice === "connected" ? <div className="alert success" role="status"><strong>{t("drive.connectedTitle")}</strong><span>{t("drive.connectedDescription")}</span></div> : null}
      {connectionNotice === "error" ? <div className="alert error" role="alert"><strong>{t("operation.failedTitle")}</strong><span>{t("error.driveConnectionFailed")}</span></div> : null}
      {error ? <div className="alert error" role="alert"><strong>{t("operation.failedTitle")}</strong><span>{messageOf(error, t)}</span></div> : null}

      {driveConnection?.status !== "CONNECTED" ? (
        <section className="setup-card drive-connect-card">
          <div className="setup-icon google-drive-icon" aria-hidden="true">G</div>
          <div>
            <span className="eyebrow">{t("drive.initialSetup")}</span>
            <h2>{t("drive.connectTitle")}</h2>
            <p>{t(driveConnection?.status === "NOT_CONFIGURED" ? "drive.notConfiguredDescription" : "drive.connectDescription")}</p>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={connectDrive}
            disabled={connectingDrive || driveConnection?.status === "NOT_CONFIGURED"}
          >
            {connectingDrive ? t("drive.connecting") : t("drive.connectAction")}
          </button>
        </section>
      ) : !repository || repository.status !== "ACTIVE" ? (
        <section className="setup-card">
          <div className="setup-icon" aria-hidden="true">↗</div>
          <div>
            <span className="eyebrow">{t("repository.initialSetup")}</span>
            <h2>{repository?.status === "ERROR" ? t("repository.retryTitle") : t("repository.createTitle")}</h2>
            <p>{t("repository.createDescription")}</p>
          </div>
          <button className="primary-button" type="button" onClick={provision} disabled={provisioning}>
            {provisioning ? t("repository.preparing") : repository?.status === "ERROR" ? t("common.retry") : t("repository.prepareAction")}
          </button>
        </section>
      ) : (
        <>
          <section className="upload-card">
            <div
              className={`drop-zone ${dragging ? "dragging" : ""}`}
              onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <div className="upload-icon" aria-hidden="true">↑</div>
              <h2>{t("upload.title")}</h2>
              <p>{t("upload.description")}</p>
              <button className="primary-button" type="button" onClick={() => inputRef.current?.click()}>{t("upload.selectAction")}</button>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                multiple
                hidden
                aria-label={t("upload.selectAction")}
                onChange={(event) => uploadFiles(Array.from(event.target.files ?? []))}
              />
              <small>{t("upload.constraints")}</small>
            </div>
            <div className="repository-detail">
              <span className="detail-label">{t("drive.connectedAccount")}</span>
              <strong className="connection-account">{driveConnection.accountEmail ?? t("common.notAvailable")}</strong>
              <span className="detail-label">{t("repository.namespace")}</span>
              <code>{repository.repositoryNamespace}</code>
              <p>{t("repository.notIndexed")}</p>
            </div>
          </section>

          {uploads.length ? (
            <section className="upload-queue" aria-live="polite">
              <div className="section-heading"><div><span className="eyebrow blue">{t("upload.activity")}</span><h2>{t("upload.latest")}</h2></div></div>
              {uploads.map((upload, index) => (
                <div className="queue-item" key={`${upload.name}-${index}`}>
                  <span className={`file-state ${upload.state}`} aria-hidden="true">{upload.state === "uploading" ? "…" : upload.state === "stored" ? "✓" : "!"}</span>
                  <div><strong>{upload.name}</strong><small>{upload.error ? messageOf(upload.error, t) : labelForUpload(upload.state, t)}</small></div>
                </div>
              ))}
            </section>
          ) : null}

          <section className="documents-card">
            <div className="section-heading">
              <div><span className="eyebrow blue">{t("documents.library")}</span><h2>{t("documents.title")}</h2><p className="section-description">{t("documents.description")}</p></div>
              <div className="library-actions">
                <button className="refresh-button" type="button" onClick={refreshDocuments} disabled={refreshingDocuments}>
                  <svg className={refreshingDocuments ? "rotating" : ""} viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5" /><path d="M18.4 9A7 7 0 1 0 19 16" /></svg>
                  {t(refreshingDocuments ? "documents.refreshing" : "documents.refreshAction")}
                </button>
                <span className="count-badge">{t(documents.length === 1 ? "documents.count.one" : "documents.count.other", { count: documents.length })}</span>
              </div>
            </div>
            <div className="document-toolbar">
              <label className="document-search">
                <span className="sr-only">{t("documents.search.label")}</span>
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" /></svg>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("documents.search.placeholder")} />
              </label>
              <label className="document-select">
                <span>{t("documents.filter.label")}</span>
                <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as DocumentTypeFilter)}>
                  <option value="all">{t("documents.filter.all")}</option>
                  <option value="pdf">{t("documents.filter.pdf")}</option>
                  <option value="document">{t("documents.filter.documents")}</option>
                  <option value="presentation">{t("documents.filter.presentations")}</option>
                  <option value="spreadsheet">{t("documents.filter.spreadsheets")}</option>
                  <option value="text">{t("documents.filter.text")}</option>
                  <option value="web">{t("documents.filter.web")}</option>
                </select>
              </label>
              <label className="document-select">
                <span>{t("documents.sort.label")}</span>
                <select value={sort} onChange={(event) => setSort(event.target.value as DocumentSort)}>
                  <option value="modified-desc">{t("documents.sort.newest")}</option>
                  <option value="modified-asc">{t("documents.sort.oldest")}</option>
                  <option value="name-asc">{t("documents.sort.name")}</option>
                </select>
              </label>
            </div>
            {documents.length === 0 ? (
              <div className="empty-state"><span aria-hidden="true">□</span><strong>{t("documents.emptyTitle")}</strong><p>{t("documents.emptyDescription")}</p></div>
            ) : visibleDocuments.length === 0 ? (
              <div className="empty-state compact"><span aria-hidden="true">0</span><strong>{t("documents.noResultsTitle")}</strong><p>{t("documents.noResultsDescription")}</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>{t("documents.column.document")}</th><th>{t("documents.column.type")}</th><th>{t("documents.column.size")}</th><th>{t("documents.column.modified")}</th><th>{t("documents.column.status")}</th><th><span className="sr-only">{t("documents.column.actions")}</span></th></tr></thead>
                  <tbody>
                    {visibleDocuments.map((document) => (
                      <tr key={document.driveFileId}>
                        <td><div className="document-name"><span className="file-icon">{extensionOf(document.name, t)}</span><div><strong>{document.name}</strong><small>{document.sha256 ? `${t("documents.hashPrefix")} · ${document.sha256.slice(0, 12)}` : t("documents.existingInDrive")}</small></div></div></td>
                        <td>{document.mimeType || t("common.notAvailable")}</td>
                        <td>{formatBytes(document.sizeBytes, locale, t)}</td>
                        <td>{formatDate(document.modifiedAt, locale)}</td>
                        <td><span className="status-badge stored">{t("documents.status.stored")}</span></td>
                        <td>
                          <div className="document-actions">
                            {document.webViewLink ? <a className="icon-button" href={document.webViewLink} target="_blank" rel="noreferrer" aria-label={t("documents.open", { name: document.name })} title={t("documents.open", { name: document.name })}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8" /><path d="M19 13v6H5V5h6" /></svg></a> : null}
                            <button className="icon-button" type="button" onClick={() => download(document)} aria-label={t("documents.download", { name: document.name })} title={t("documents.download", { name: document.name })}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5" /><path d="M5 20h14" /></svg></button>
                            <button className="icon-button danger" type="button" onClick={() => setDocumentToDelete(document)} aria-label={t("documents.delete", { name: document.name })} title={t("documents.delete", { name: document.name })}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          {documentToDelete ? (
            <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) setDocumentToDelete(null); }}>
              <section className="confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-document-title" aria-describedby="delete-document-description">
                <span className="confirmation-icon" aria-hidden="true">!</span>
                <h2 id="delete-document-title">{t("documents.deleteDialog.title")}</h2>
                <p id="delete-document-description">{t("documents.deleteDialog.description", { name: documentToDelete.name })}</p>
                <div className="confirmation-actions">
                  <button className="secondary-button" type="button" onClick={() => setDocumentToDelete(null)} disabled={deleting}>{t("common.cancel")}</button>
                  <button className="danger-button" type="button" onClick={removeDocument} disabled={deleting}>{deleting ? t("documents.deleting") : t("documents.deleteAction")}</button>
                </div>
              </section>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function RepositoryPill({ connection, t }: { connection: DriveConnection | null; t: Translate }) {
  const active = connection?.status === "CONNECTED";
  return <div className={`repository-pill ${active ? "active" : "inactive"}`}><span aria-hidden="true" />{t(active ? "repository.connected" : "repository.pending")}</div>;
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

function extensionOf(name: string, t: Translate): string {
  return name.includes(".") ? name.split(".").pop()!.slice(0, 4).toUpperCase() : t("documents.fileFallback");
}

function categoryOf(document: StoredDocument): Exclude<DocumentTypeFilter, "all"> {
  const extension = document.name.includes(".") ? document.name.split(".").pop()!.toLowerCase() : "";
  if (extension === "pdf") return "pdf";
  if (extension === "docx") return "document";
  if (extension === "pptx") return "presentation";
  if (extension === "xlsx" || extension === "csv") return "spreadsheet";
  if (extension === "html" || extension === "htm" || extension === "url") return "web";
  return "text";
}

function labelForUpload(state: UploadResult["state"], t: Translate): string {
  return t(`upload.${state}`);
}
