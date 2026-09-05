"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocale, useT } from "@/components/IntlProviderClient";
import {
  Business,
  AgentFactoryApiError,
  createBusiness,
  deleteBusiness,
  fetchBusinesses,
  updateBusiness
} from "@/lib/agent-factory-api";
import { clearActiveBusinessId, getActiveBusinessId, setActiveBusinessId } from "@/lib/session";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

function notifyBusinessesChanged() {
  window.dispatchEvent(new Event("ametis:businesses-changed"));
}

export default function BusinessesPage() {
  const t = useT();
  const { locale } = useLocale();
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [businessToDelete, setBusinessToDelete] = useState<Business | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchBusinesses();
      setBusinesses(list);
      setActiveId(getActiveBusinessId());
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(load, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { name: name.trim(), description: description.trim() || undefined };
      if (editingId) {
        const updated = await updateBusiness(editingId, payload);
        setBusinesses((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await createBusiness(payload);
        setBusinesses((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
        if (!getActiveBusinessId()) {
          setActiveBusinessId(created.id);
          setActiveId(created.id);
        }
      }
      notifyBusinessesChanged();
      resetForm();
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  function edit(business: Business) {
    setEditingId(business.id);
    setName(business.name);
    setDescription(business.description ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setDescription("");
  }

  async function toggleStatus(business: Business) {
    setBusyId(business.id);
    setError(null);
    try {
      const updated = await updateBusiness(business.id, {
        name: business.name,
        description: business.description ?? undefined,
        status: business.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE"
      });
      setBusinesses((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      notifyBusinessesChanged();
    } catch (requestError) {
      setError(requestError);
    } finally {
      setBusyId(null);
    }
  }

  function select(business: Business) {
    if (business.id === activeId) return;
    setActiveBusinessId(business.id);
    window.location.reload();
  }

  async function confirmDelete() {
    if (!businessToDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteBusiness(businessToDelete.id, deleteConfirm.trim());
      const wasActive = businessToDelete.id === activeId;
      if (wasActive) clearActiveBusinessId();
      setBusinesses((current) => current.filter((item) => item.id !== businessToDelete.id));
      setBusinessToDelete(null);
      setDeleteConfirm("");
      notifyBusinessesChanged();
      if (wasActive) window.location.reload();
    } catch (requestError) {
      setError(requestError);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <section className="loading-card" role="status"><span className="spinner" aria-hidden="true" />{t("business.loading")}</section>;
  }

  return (
    <div className="page-grid">
      <section className="intro-card">
        <div>
          <span className="eyebrow blue">{t("business.eyebrow")}</span>
          <h2>{t("business.title")}</h2>
          <p>{t("business.description")}</p>
        </div>
      </section>

      {error ? <div className="alert error" role="alert"><strong>{t("operation.failedTitle")}</strong><span>{messageOf(error, t)}</span></div> : null}

      <section className="knowledge-layout">
        <form className="knowledge-form" onSubmit={submit}>
          <div>
            <span className="eyebrow">{t(editingId ? "business.editEyebrow" : "business.createEyebrow")}</span>
            <h2>{t(editingId ? "business.editTitle" : "business.createTitle")}</h2>
            <p>{t("business.createDescription")}</p>
          </div>
          <label className="form-field">
            <span className="field-label">{t("business.nameLabel")}</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("business.namePlaceholder")} maxLength={120} />
          </label>
          <label className="form-field">
            <span className="field-label">{t("business.descriptionLabel")}</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("business.descriptionPlaceholder")} maxLength={500} />
          </label>
          <div className="form-actions">
            {editingId ? <button className="secondary-button" type="button" onClick={resetForm} disabled={saving}>{t("common.cancel")}</button> : null}
            <button className="primary-button" type="submit" disabled={saving || !name.trim()}>
              {saving ? t("business.saving") : t(editingId ? "business.updateAction" : "business.createAction")}
            </button>
          </div>
        </form>

        <section className="knowledge-list">
          <div className="section-heading">
            <div>
              <span className="eyebrow blue">{t("business.inventory")}</span>
              <h2>{t("business.listTitle")}</h2>
              <p className="section-description">{t("business.listDescription")}</p>
            </div>
            <span className="count-badge">{t(businesses.length === 1 ? "business.count.one" : "business.count.other", { count: businesses.length })}</span>
          </div>
          {businesses.length ? (
            <div className="knowledge-items">
              {businesses.map((business) => (
                <article className="knowledge-item" key={business.id}>
                  <div>
                    <span className={`status-badge ${business.status === "ACTIVE" ? "stored" : "inactive"}`}>
                      {t(`business.status.${business.status.toLowerCase()}`)}
                    </span>
                    {business.id === activeId ? <span className="status-badge stored">{t("business.active")}</span> : null}
                    <h3>{business.name}</h3>
                    <p>{business.description || t("business.noDescription")}</p>
                    <small>{t("business.updatedAt", { date: formatDate(business.updatedAt, locale) })}</small>
                  </div>
                  <div className="knowledge-meta">
                    <span>{business.slug}</span>
                    <div className="item-actions">
                      {business.id !== activeId && business.status === "ACTIVE" ? (
                        <button className="small-action" type="button" onClick={() => select(business)}>{t("business.use")}</button>
                      ) : null}
                      <button className="small-action" type="button" onClick={() => toggleStatus(business)} disabled={busyId === business.id}>
                        {t(business.status === "ACTIVE" ? "business.archive" : "business.activate")}
                      </button>
                      <button className="icon-button" type="button" onClick={() => edit(business)} aria-label={t("business.edit", { name: business.name })} title={t("business.edit", { name: business.name })}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                      </button>
                      {business.status === "ARCHIVED" ? (
                        <button
                          className="icon-button danger"
                          type="button"
                          onClick={() => { setBusinessToDelete(business); setDeleteConfirm(""); }}
                          aria-label={t("business.delete", { name: business.name })}
                          title={t("business.delete", { name: business.name })}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state compact"><span aria-hidden="true">0</span><strong>{t("business.emptyTitle")}</strong><p>{t("business.emptyDescription")}</p></div>
          )}
        </section>
      </section>

      {businessToDelete ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) setBusinessToDelete(null); }}>
          <section className="confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-business-title" aria-describedby="delete-business-description">
            <span className="confirmation-icon" aria-hidden="true">!</span>
            <h2 id="delete-business-title">{t("business.deleteDialog.title", { name: businessToDelete.name })}</h2>
            <p id="delete-business-description">{t("business.deleteDialog.description")}</p>
            <label className="form-field">
              <span className="field-label">{t("business.deleteDialog.confirmLabel", { name: businessToDelete.name })}</span>
              <input value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} placeholder={businessToDelete.name} autoFocus />
            </label>
            <div className="confirmation-actions">
              <button className="secondary-button" type="button" onClick={() => setBusinessToDelete(null)} disabled={deleting}>{t("common.cancel")}</button>
              <button
                className="danger-button"
                type="button"
                onClick={confirmDelete}
                disabled={deleting || deleteConfirm.trim().toLowerCase() !== businessToDelete.name.toLowerCase()}
              >
                {deleting ? t("business.deleting") : t("business.deleteAction")}
              </button>
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
