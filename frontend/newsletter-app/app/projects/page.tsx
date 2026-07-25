"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProject,
  deleteProject,
  fetchProjectFormOptions,
  fetchProjects,
  fetchProjectsIncludingDeleted,
  restoreProject,
  updateProject
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

export default function ProjectsPage() {
  const DEFAULT_TONE_OPTIONS = ["PROFESIONAL", "EJECUTIVO", "ANALÍTICO"];
  const DEFAULT_AUDIENCE_OPTIONS = ["PYMES", "CORPORATIVO", "STARTUPS"];
  const t = useT();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("es");
  const [tone, setTone] = useState("");
  const [audience, setAudience] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "ACTIVE" | "ARCHIVED">("ACTIVE");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("success");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  const projects = useQuery({
    queryKey: ["newsletter", "projects", showDeleted],
    queryFn: showDeleted ? fetchProjectsIncludingDeleted : fetchProjects
  });
  const sortedProjects = [...(projects.data ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const totalPages = Math.max(1, Math.ceil(sortedProjects.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedProjects = sortedProjects.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const formatCreatedAt = (raw: string) => {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return t("newsletter.common.notConfigured");
    }
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  };
  const formOptions = useQuery({ queryKey: ["newsletter", "projects", "options"], queryFn: fetchProjectFormOptions });
  const toneOptions = formOptions.data?.tones?.length ? formOptions.data.tones : DEFAULT_TONE_OPTIONS;
  const audienceOptions = formOptions.data?.audiences?.length ? formOptions.data.audiences : DEFAULT_AUDIENCE_OPTIONS;
  const projectStatusLabel = (value: "DRAFT" | "ACTIVE" | "ARCHIVED") => {
    if (value === "DRAFT") return t("newsletter.projectStatus.draft");
    if (value === "ACTIVE") return t("newsletter.projectStatus.active");
    return t("newsletter.projectStatus.archived");
  };
  const renderProjectState = (project: (typeof sortedProjects)[number]) => {
    if (project.deletedAt) {
      return {
        label: t("newsletter.projectStatus.deleted"),
        variant: "warning" as const,
        className: "bg-rose-100 text-rose-700"
      };
    }
    if (project.status === "ACTIVE") {
      return {
        label: projectStatusLabel(project.status),
        variant: "neutral" as const,
        className: "bg-emerald-100 text-emerald-700"
      };
    }
    if (project.status === "ARCHIVED") {
      return {
        label: projectStatusLabel(project.status),
        variant: "neutral" as const,
        className: "bg-slate-200 text-slate-700"
      };
    }
    return {
      label: projectStatusLabel(project.status),
      variant: "neutral" as const,
      className: "bg-amber-100 text-amber-700"
    };
  };
  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async () => {
      setFeedback(t("newsletter.projects.form.success"));
      setFeedbackType("success");
      setName("");
      setDescription("");
      setTone("");
      setAudience("");
      setEditingProjectId(null);
      await queryClient.invalidateQueries({ queryKey: ["newsletter", "projects"] });
    },
    onError: (error) => {
      setFeedback(resolveNewsletterErrorMessage(error, t, "newsletter.projects.form.error"));
      setFeedbackType("error");
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateProject>[1] }) => updateProject(id, payload),
    onSuccess: async () => {
      setFeedback(t("newsletter.projects.form.updateSuccess"));
      setFeedbackType("success");
      setName("");
      setDescription("");
      setTone("");
      setAudience("");
      setStatus("ACTIVE");
      setLanguage("es");
      setEditingProjectId(null);
      await queryClient.invalidateQueries({ queryKey: ["newsletter", "projects"] });
    },
    onError: (error) => {
      setFeedback(resolveNewsletterErrorMessage(error, t, "newsletter.projects.form.updateError"));
      setFeedbackType("error");
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: async () => {
      setFeedback(t("newsletter.projects.form.deleteSuccess"));
      setFeedbackType("success");
      await queryClient.invalidateQueries({ queryKey: ["newsletter", "projects"] });
    },
    onError: (error) => {
      setFeedback(resolveNewsletterErrorMessage(error, t, "newsletter.projects.form.deleteError"));
      setFeedbackType("error");
    }
  });

  const restoreProjectMutation = useMutation({
    mutationFn: restoreProject,
    onSuccess: async () => {
      setFeedback(t("newsletter.projects.form.restoreSuccess"));
      setFeedbackType("success");
      await queryClient.invalidateQueries({ queryKey: ["newsletter", "projects"] });
    },
    onError: (error) => {
      setFeedback(resolveNewsletterErrorMessage(error, t, "newsletter.projects.form.restoreError"));
      setFeedbackType("error");
    }
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setLanguage("es");
    setTone("");
    setAudience("");
    setStatus("ACTIVE");
    setEditingProjectId(null);
  };

  const onEdit = (project: (typeof sortedProjects)[number]) => {
    setFeedback(null);
    setEditingProjectId(project.id);
    setName(project.name);
    setDescription(project.description ?? "");
    setLanguage(project.language);
    setTone(project.tone ?? "");
    setAudience(project.audience ?? "");
    setStatus(project.status);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDelete = async (project: (typeof sortedProjects)[number]) => {
    const confirmed = window.confirm(t("newsletter.projects.form.deleteConfirm", { name: project.name }));
    if (!confirmed) return;
    setFeedback(null);
    try {
      await deleteProjectMutation.mutateAsync(project.id);
      if (editingProjectId === project.id) {
        resetForm();
      }
    } catch {
      // Feedback is handled in mutation onError.
    }
  };

  const onRestore = async (project: (typeof sortedProjects)[number]) => {
    setFeedback(null);
    try {
      await restoreProjectMutation.mutateAsync(project.id);
    } catch {
      // Feedback is handled in mutation onError.
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    try {
      const payload = {
        name,
        description: description || undefined,
        language,
        tone: tone || undefined,
        audience: audience || undefined,
        status
      };
      if (editingProjectId) {
        await updateProjectMutation.mutateAsync({ id: editingProjectId, payload });
      } else {
        await createProjectMutation.mutateAsync(payload);
      }
    } catch {
      // Feedback is handled in mutation onError.
    }
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("newsletter.projects.manage.title")}</CardTitle>
          <CardDescription>{t("newsletter.projects.manage.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
            <Field label={t("newsletter.projects.form.name")}>
              <input value={name} onChange={(e) => setName(e.target.value)} className={CONTROL_CLASS} required />
            </Field>
            <Field label={t("newsletter.projects.form.description")}>
              <input value={description} onChange={(e) => setDescription(e.target.value)} className={CONTROL_CLASS} />
            </Field>
            <Field label={t("newsletter.projects.form.language")}>
              <div className="relative">
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className={SELECT_CLASS}>
                  <option value="es">es</option>
                  <option value="en">en</option>
                </select>
                <Chevron />
              </div>
            </Field>
            <Field label={t("newsletter.projects.form.tone")}>
              <div className="relative">
                <select value={tone} onChange={(e) => setTone(e.target.value)} className={SELECT_CLASS}>
                  <option value="">{t("newsletter.projects.form.optionalPlaceholder")}</option>
                  {toneOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <Chevron />
              </div>
            </Field>
            <Field label={t("newsletter.projects.form.audience")}>
              <div className="relative">
                <select value={audience} onChange={(e) => setAudience(e.target.value)} className={SELECT_CLASS}>
                  <option value="">{t("newsletter.projects.form.optionalPlaceholder")}</option>
                  {audienceOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <Chevron />
              </div>
            </Field>
            <Field label={t("newsletter.projects.form.status")}>
              <div className="relative">
                <select value={status} onChange={(e) => setStatus(e.target.value as "DRAFT" | "ACTIVE" | "ARCHIVED")} className={SELECT_CLASS}>
                  <option value="DRAFT">{projectStatusLabel("DRAFT")}</option>
                  <option value="ACTIVE">{projectStatusLabel("ACTIVE")}</option>
                  <option value="ARCHIVED">{projectStatusLabel("ARCHIVED")}</option>
                </select>
                <Chevron />
              </div>
            </Field>
            <div className="md:col-span-2 flex justify-end">
              <div className="flex gap-2">
                {editingProjectId ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="h-11 rounded-xl border border-[#bccbe0] bg-white px-4 text-sm font-semibold text-[#2c4468] transition hover:bg-[#f3f7ff]"
                  >
                    {t("newsletter.projects.form.cancelEdit")}
                  </button>
                ) : null}
                <Button type="submit" disabled={createProjectMutation.isPending || updateProjectMutation.isPending}>
                  {createProjectMutation.isPending || updateProjectMutation.isPending
                    ? `${editingProjectId ? t("newsletter.projects.form.update") : t("newsletter.projects.form.submit")}...`
                    : editingProjectId
                      ? t("newsletter.projects.form.update")
                      : t("newsletter.projects.form.submit")}
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
          <CardTitle>{t("newsletter.projects.title")}</CardTitle>
          <CardDescription>{t("newsletter.projects.subtitle")}</CardDescription>
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
            <span>{t("newsletter.projects.showDeleted")}</span>
          </label>
          {projects.isLoading ? <p>{t("newsletter.loading.projects")}</p> : null}
          <div className="overflow-hidden rounded-xl border border-[#d3deec] bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#f3f7ff] text-left text-xs uppercase tracking-[0.04em] text-[#4a6487]">
                  <tr>
                    <th className="px-4 py-3">{t("newsletter.projects.field.title")}</th>
                    <th className="px-4 py-3">{t("newsletter.projects.field.description")}</th>
                    <th className="px-4 py-3">{t("newsletter.projects.field.language")}</th>
                    <th className="px-4 py-3">{t("newsletter.projects.field.tone")}</th>
                    <th className="px-4 py-3">{t("newsletter.projects.field.audience")}</th>
                    <th className="px-4 py-3">{t("newsletter.projects.field.status")}</th>
                    <th className="px-4 py-3">{t("newsletter.projects.field.createdAt")}</th>
                    <th className="px-4 py-3 text-right">{t("newsletter.projects.field.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedProjects.map((project) => (
                    <tr key={project.id} className="border-t border-[#e3ebf7] text-[#2c4468]">
                      <td className="px-4 py-3 font-semibold">{project.name}</td>
                      <td className="px-4 py-3">{project.description ?? t("newsletter.common.noDescription")}</td>
                      <td className="px-4 py-3">{project.language}</td>
                      <td className="px-4 py-3">{project.tone ?? t("newsletter.common.notConfigured")}</td>
                      <td className="px-4 py-3">{project.audience ?? t("newsletter.common.notConfigured")}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={renderProjectState(project).variant}
                          className={renderProjectState(project).className}
                        >
                          {renderProjectState(project).label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{formatCreatedAt(project.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {project.deletedAt ? (
                            <button
                              type="button"
                              onClick={() => onRestore(project)}
                              disabled={restoreProjectMutation.isPending}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#c9d7ea] text-[#2c7a4b] transition hover:bg-[#eefcf2]"
                              title={t("newsletter.projects.actions.restore")}
                              aria-label={t("newsletter.projects.actions.restore")}
                            >
                              <RestoreIcon />
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => onEdit(project)}
                                disabled={deleteProjectMutation.isPending || restoreProjectMutation.isPending}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#c9d7ea] text-[#365f9d] transition hover:bg-[#eef4ff]"
                                title={t("newsletter.projects.actions.edit")}
                                aria-label={t("newsletter.projects.actions.edit")}
                              >
                                <EditIcon />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDelete(project)}
                                disabled={deleteProjectMutation.isPending || restoreProjectMutation.isPending}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#c9d7ea] text-[#b14545] transition hover:bg-[#fff1f1]"
                                title={t("newsletter.projects.actions.delete")}
                                aria-label={t("newsletter.projects.actions.delete")}
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
            <div className="flex items-center justify-between border-t border-[#e3ebf7] px-4 py-3 text-xs text-[#5e779a]">
              <span>
                {t("newsletter.projects.pagination.summary", {
                  from: sortedProjects.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1,
                  to: Math.min(currentPage * PAGE_SIZE, sortedProjects.length),
                  total: sortedProjects.length
                })}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                  className="rounded-md border border-[#c9d7ea] px-2 py-1 disabled:opacity-50"
                >
                  {t("newsletter.projects.pagination.prev")}
                </button>
                <span className="min-w-16 text-center">
                  {t("newsletter.projects.pagination.page", { page: currentPage, totalPages })}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                  className="rounded-md border border-[#c9d7ea] px-2 py-1 disabled:opacity-50"
                >
                  {t("newsletter.projects.pagination.next")}
                </button>
              </div>
            </div>
          </div>
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
