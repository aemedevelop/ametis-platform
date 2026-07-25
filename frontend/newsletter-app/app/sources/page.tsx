"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProjectSource,
  deleteSource,
  fetchProjects,
  fetchSources,
  fetchSourcesIncludingDeleted,
  restoreSource,
  updateSource
} from "@/lib/newsletter-api";
import { resolveNewsletterErrorMessage } from "@/lib/error-utils";
import { AlertInline } from "@/components/ui/alert-inline";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/IntlProviderClient";

const CONTROL_CLASS =
  "h-11 w-full rounded-xl border border-[#bccbe0] bg-white px-4 text-sm font-medium text-[#23416a] shadow-[0_1px_2px_rgba(28,58,96,0.06)] outline-none transition hover:border-[#9fb5d6] focus:border-[#3f6cb2] focus:ring-4 focus:ring-[#3f6cb2]/15 [color-scheme:light]";
const SELECT_CLASS = `${CONTROL_CLASS} appearance-none pr-11`;

export default function SourcesPage() {
  const t = useT();
  const queryClient = useQueryClient();
  const projects = useQuery({ queryKey: ["newsletter", "projects"], queryFn: fetchProjects });
  const [showDeleted, setShowDeleted] = useState(false);
  const sources = useQuery({
    queryKey: ["newsletter", "sources", showDeleted],
    queryFn: showDeleted ? fetchSourcesIncludingDeleted : fetchSources
  });
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<"RSS" | "API" | "URL">("RSS");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [active, setActive] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("success");
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;
  const projectNamesById = useMemo(() => {
    return new Map((projects.data ?? []).map((project) => [project.id, project.name]));
  }, [projects.data]);
  const sortedSources = useMemo(
    () => [...(sources.data ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [sources.data]
  );
  const totalPages = Math.max(1, Math.ceil(sortedSources.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedSources = sortedSources.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    if (!projectId && projects.data?.length) {
      setProjectId(projects.data[0].id);
    }
  }, [projectId, projects.data]);

  const createSourceMutation = useMutation({
    mutationFn: (payload: { projectId: string; name: string; type: "RSS" | "API" | "URL"; url: string; category?: string; active: boolean }) =>
      createProjectSource(payload.projectId, {
        name: payload.name,
        type: payload.type,
        url: payload.url,
        category: payload.category,
        active: payload.active
      }),
    onSuccess: async () => {
      setFeedback(t("newsletter.sources.form.success"));
      setFeedbackType("success");
      setName("");
      setUrl("");
      setCategory("");
      setPage(1);
      await queryClient.invalidateQueries({ queryKey: ["newsletter", "sources"] });
    },
    onError: (error) => {
      setFeedback(resolveNewsletterErrorMessage(error, t, "newsletter.sources.form.error"));
      setFeedbackType("error");
    }
  });

  const updateSourceMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name: string; type: "RSS" | "API" | "URL"; url: string; category?: string; active: boolean } }) =>
      updateSource(id, payload),
    onSuccess: async () => {
      setFeedback(t("newsletter.sources.form.updateSuccess"));
      setFeedbackType("success");
      resetForm();
      setPage(1);
      await queryClient.invalidateQueries({ queryKey: ["newsletter", "sources"] });
    },
    onError: (error) => {
      setFeedback(resolveNewsletterErrorMessage(error, t, "newsletter.sources.form.updateError"));
      setFeedbackType("error");
    }
  });

  const deleteSourceMutation = useMutation({
    mutationFn: deleteSource,
    onSuccess: async () => {
      setFeedback(t("newsletter.sources.form.deleteSuccess"));
      setFeedbackType("success");
      setPage(1);
      await queryClient.invalidateQueries({ queryKey: ["newsletter", "sources"] });
    },
    onError: (error) => {
      setFeedback(resolveNewsletterErrorMessage(error, t, "newsletter.sources.form.deleteError"));
      setFeedbackType("error");
    }
  });

  const restoreSourceMutation = useMutation({
    mutationFn: restoreSource,
    onSuccess: async () => {
      setFeedback(t("newsletter.sources.form.restoreSuccess"));
      setFeedbackType("success");
      setPage(1);
      await queryClient.invalidateQueries({ queryKey: ["newsletter", "sources"] });
    },
    onError: (error) => {
      setFeedback(resolveNewsletterErrorMessage(error, t, "newsletter.sources.form.restoreError"));
      setFeedbackType("error");
    }
  });

  const resetForm = () => {
    setName("");
    setType("RSS");
    setUrl("");
    setCategory("");
    setActive(true);
    setEditingSourceId(null);
  };

  const onEdit = (source: (typeof sortedSources)[number]) => {
    setFeedback(null);
    setEditingSourceId(source.id);
    if (source.projectId) {
      setProjectId(source.projectId);
    }
    setName(source.name);
    setType(source.type);
    setUrl(source.url);
    setCategory(source.category ?? "");
    setActive(source.active);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDelete = async (source: (typeof sortedSources)[number]) => {
    const confirmed = window.confirm(t("newsletter.sources.form.deleteConfirm", { name: source.name }));
    if (!confirmed) return;
    setFeedback(null);
    try {
      await deleteSourceMutation.mutateAsync(source.id);
      if (editingSourceId === source.id) {
        resetForm();
      }
    } catch {
      // Feedback is handled in mutation onError.
    }
  };

  const onRestore = async (source: (typeof sortedSources)[number]) => {
    setFeedback(null);
    try {
      await restoreSourceMutation.mutateAsync(source.id);
    } catch {
      // Feedback is handled in mutation onError.
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    if (!projectId) {
      setFeedback(t("newsletter.agent.error.projectRequired"));
      return;
    }
    try {
      if (editingSourceId) {
        await updateSourceMutation.mutateAsync({
          id: editingSourceId,
          payload: {
            name,
            type,
            url,
            category: category || undefined,
            active
          }
        });
      } else {
        await createSourceMutation.mutateAsync({
          projectId,
          name,
          type,
          url,
          category: category || undefined,
          active
        });
      }
    } catch {
      // Feedback is handled in mutation onError.
    }
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("newsletter.sources.manage.title")}</CardTitle>
          <CardDescription>{t("newsletter.sources.manage.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
            <Field label={t("newsletter.sources.form.project")}>
              <div className="relative">
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={SELECT_CLASS} required>
                  {(projects.data ?? []).map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <Chevron />
              </div>
            </Field>
            <Field label={t("newsletter.sources.form.name")}>
              <input value={name} onChange={(e) => setName(e.target.value)} className={CONTROL_CLASS} required />
            </Field>
            <Field label={t("newsletter.sources.form.type")}>
              <div className="relative">
                <select value={type} onChange={(e) => setType(e.target.value as "RSS" | "API" | "URL")} className={SELECT_CLASS}>
                  <option value="RSS">RSS</option>
                  <option value="API">API</option>
                  <option value="URL">URL</option>
                </select>
                <Chevron />
              </div>
            </Field>
            <Field label={t("newsletter.sources.form.url")}>
              <input value={url} onChange={(e) => setUrl(e.target.value)} className={CONTROL_CLASS} required />
            </Field>
            <Field label={t("newsletter.sources.form.category")}>
              <input value={category} onChange={(e) => setCategory(e.target.value)} className={CONTROL_CLASS} />
            </Field>
            <label className="inline-flex items-center gap-2 pt-7 text-sm font-semibold text-[#274268]">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded border border-[#9fb5d6] bg-white accent-[#1f5db8] [color-scheme:light]"
              />
              {t("newsletter.sources.form.active")}
            </label>
            <div className="md:col-span-2 flex justify-end">
              <div className="flex gap-2">
                {editingSourceId ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="h-11 rounded-xl border border-[#bccbe0] bg-white px-4 text-sm font-semibold text-[#2c4468] transition hover:bg-[#f3f7ff]"
                  >
                    {t("newsletter.sources.form.cancelEdit")}
                  </button>
                ) : null}
                <Button type="submit" disabled={createSourceMutation.isPending || updateSourceMutation.isPending}>
                  {createSourceMutation.isPending || updateSourceMutation.isPending
                    ? `${editingSourceId ? t("newsletter.sources.form.update") : t("newsletter.sources.form.submit")}...`
                    : editingSourceId
                      ? t("newsletter.sources.form.update")
                      : t("newsletter.sources.form.submit")}
                </Button>
              </div>
            </div>
            {feedback ? (
              <div className="md:col-span-2">
                {feedbackType === "error" ? (
                  <AlertInline message={feedback} />
                ) : (
                  <p className="text-sm text-[#355682]">{feedback}</p>
                )}
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("newsletter.sources.title")}</CardTitle>
          <CardDescription>{t("newsletter.sources.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <label className="mb-3 inline-flex cursor-pointer items-center gap-2 text-sm text-[#2c4468]">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => {
                setShowDeleted(e.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 rounded border border-[#b8c9e2] accent-[#3f6cb2] [color-scheme:light]"
            />
            <span>{t("newsletter.sources.showDeleted")}</span>
          </label>
          {sources.isLoading ? <p>{t("newsletter.loading.sources")}</p> : null}
          {sortedSources.length === 0 && !sources.isLoading ? (
            <div className="rounded-xl border border-dashed border-[#ccd8eb] bg-[#f8fbff] px-4 py-6 text-sm text-[#5a7092]">
              <p className="font-semibold text-[#29466d]">{t("newsletter.sources.empty.title")}</p>
              <p>{t("newsletter.sources.empty.subtitle")}</p>
            </div>
          ) : null}
          {sortedSources.length > 0 ? (
            <>
              <div className="overflow-hidden rounded-xl border border-[#d3deec] bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[#f3f7ff] text-left text-xs uppercase tracking-[0.04em] text-[#4a6487]">
                      <tr>
                        <th className="px-4 py-3">{t("newsletter.sources.form.project")}</th>
                        <th className="px-4 py-3">{t("newsletter.sources.table.name")}</th>
                        <th className="px-4 py-3">{t("newsletter.sources.table.type")}</th>
                        <th className="px-4 py-3">{t("newsletter.sources.table.url")}</th>
                        <th className="px-4 py-3">{t("newsletter.sources.form.category")}</th>
                        <th className="px-4 py-3">{t("newsletter.sources.table.status")}</th>
                        <th className="px-4 py-3 text-right">{t("newsletter.sources.table.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedSources.map((source) => (
                        <tr key={source.id} className="border-t border-[#e3ebf7] text-[#2c4468]">
                          <td className="px-4 py-3">{source.projectId ? (projectNamesById.get(source.projectId) ?? source.projectId) : "-"}</td>
                          <td className="px-4 py-3 font-semibold">{source.name}</td>
                          <td className="px-4 py-3">{source.type}</td>
                          <td className="max-w-[340px] truncate px-4 py-3">{source.url}</td>
                          <td className="px-4 py-3">{source.category?.trim() ? source.category : "-"}</td>
                          <td className="px-4 py-3">
                            {source.deletedAt ? (
                              <Badge variant="warning" className="bg-rose-100 text-rose-700">
                                {t("newsletter.projectStatus.deleted")}
                              </Badge>
                            ) : (
                              <Badge
                                variant="neutral"
                                className={source.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}
                              >
                                {source.active ? t("newsletter.status.active") : t("newsletter.status.paused")}
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              {source.deletedAt ? (
                                <button
                                  type="button"
                                  onClick={() => onRestore(source)}
                                  disabled={restoreSourceMutation.isPending}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#c9d7ea] text-[#2c7a4b] transition hover:bg-[#eefcf2]"
                                  title={t("newsletter.sources.actions.restore")}
                                  aria-label={t("newsletter.sources.actions.restore")}
                                >
                                  <RestoreIcon />
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onEdit(source)}
                                    disabled={deleteSourceMutation.isPending || restoreSourceMutation.isPending}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#c9d7ea] text-[#365f9d] transition hover:bg-[#eef4ff]"
                                    title={t("newsletter.sources.actions.edit")}
                                    aria-label={t("newsletter.sources.actions.edit")}
                                  >
                                    <EditIcon />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDelete(source)}
                                    disabled={deleteSourceMutation.isPending || restoreSourceMutation.isPending}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#c9d7ea] text-[#b14545] transition hover:bg-[#fff1f1]"
                                    title={t("newsletter.sources.actions.delete")}
                                    aria-label={t("newsletter.sources.actions.delete")}
                                  >
                                    <TrashIcon />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-2 text-sm text-[#5a7092] md:flex-row md:items-center md:justify-between">
                <span>
                  {t("newsletter.projects.pagination.summary", {
                    from: sortedSources.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1,
                    to: Math.min(currentPage * PAGE_SIZE, sortedSources.length),
                    total: sortedSources.length
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                    className="h-9 rounded-lg border border-[#bccbe0] bg-white px-3 text-sm font-semibold text-[#29466d] transition hover:bg-[#f3f7ff] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t("newsletter.projects.pagination.prev")}
                  </button>
                  <span className="min-w-[130px] text-center">
                    {t("newsletter.projects.pagination.page", { page: currentPage, totalPages })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                    className="h-9 rounded-lg border border-[#bccbe0] bg-white px-3 text-sm font-semibold text-[#29466d] transition hover:bg-[#f3f7ff] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t("newsletter.projects.pagination.next")}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold text-[#274268]">{label}</span>
      {children}
    </label>
  );
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#48678f]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      aria-hidden="true"
    >
      <path d="m5 7 5 6 5-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 14.5V17h2.5L15 7.5 12.5 5 3 14.5z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m11.8 5.7 2.5 2.5" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4.5 6h11" strokeLinecap="round" />
      <path d="M7.5 6V4.5h5V6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 6.5V15a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 9v4M11.5 9v4" strokeLinecap="round" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5.5 9A4.5 4.5 0 1 1 7 12.2" strokeLinecap="round" />
      <path d="M5.5 5.5v3.8h3.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
