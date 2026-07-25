"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useT } from "@/components/IntlProviderClient";
import { Button } from "@/components/ui/button";
import { AlertInline } from "@/components/ui/alert-inline";
import { resolveNewsletterErrorMessage } from "@/lib/error-utils";
import { fetchProjectSources, fetchProjects } from "@/lib/newsletter-api";
import { useAgentGeneration, useCreateAgentGeneration } from "@/lib/queries/agent-generations";

const ROLE_OPTIONS = ["CONSULTOR_ESTRATEGICO", "ANALISTA_DE_MERCADO", "PERIODISTA_NEGOCIOS"] as const;
const STYLE_OPTIONS = ["PROFESIONAL", "EJECUTIVO", "ANALITICO"] as const;
const AUDIENCE_OPTIONS = ["PYMES", "CORPORATIVO", "STARTUPS"] as const;
const LANGUAGE_OPTIONS = ["es", "en"] as const;
const LENGTH_OPTIONS = ["SHORT", "MEDIUM", "LONG"] as const;
const STRUCTURE_OPTIONS = ["EXECUTIVE_SUMMARY", "LISTICLE", "INFORME"] as const;
const CREATIVITY_OPTIONS = ["LOW", "MEDIUM", "HIGH"] as const;
const CONTROL_CLASS =
  "h-11 w-full rounded-xl border border-[#bccbe0] bg-white px-4 text-sm font-medium text-[#23416a] shadow-[0_1px_2px_rgba(28,58,96,0.06)] outline-none transition hover:border-[#9fb5d6] focus:border-[#3f6cb2] focus:ring-4 focus:ring-[#3f6cb2]/15 [color-scheme:light]";
const SELECT_CLASS = `${CONTROL_CLASS} appearance-none pr-11`;
const CHECKBOX_CLASS =
  "h-4 w-4 cursor-pointer rounded-md border border-[#9fb5d6] bg-white shadow-[0_1px_1px_rgba(28,58,96,0.08)] accent-[#1f5db8] [color-scheme:light]";

export function AgentModePanel() {
  const t = useT();
  const projectsQuery = useQuery({ queryKey: ["newsletter", "projects"], queryFn: fetchProjects });
  const [projectId, setProjectId] = useState<string>("");
  const [useAllActiveSources, setUseAllActiveSources] = useState(true);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [maxSources, setMaxSources] = useState<string>("");
  const [titleHint, setTitleHint] = useState("");
  const [topicHint, setTopicHint] = useState("");
  const [roleProfile, setRoleProfile] = useState<string>("CONSULTOR_ESTRATEGICO");
  const [writingStyle, setWritingStyle] = useState<string>("PROFESIONAL");
  const [audience, setAudience] = useState<string>("PYMES");
  const [language, setLanguage] = useState<string>("es");
  const [length, setLength] = useState<string>("MEDIUM");
  const [structureType, setStructureType] = useState<string>("EXECUTIVE_SUMMARY");
  const [callToAction, setCallToAction] = useState("");
  const [creativityLevel, setCreativityLevel] = useState<string>("MEDIUM");
  const [useReferences, setUseReferences] = useState(false);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeConclusions, setIncludeConclusions] = useState(true);
  const [includeTags, setIncludeTags] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId && projectsQuery.data?.length) {
      setProjectId(projectsQuery.data[0].id);
    }
  }, [projectId, projectsQuery.data]);

  const sourcesQuery = useQuery({
    queryKey: ["newsletter", "project-sources", projectId],
    queryFn: () => fetchProjectSources(projectId),
    enabled: Boolean(projectId)
  });

  const activeSources = useMemo(
      () => (sourcesQuery.data ?? []).filter((source) => source.active),
      [sourcesQuery.data]
  );
  const createGeneration = useCreateAgentGeneration(projectId || null);
  const generationQuery = useAgentGeneration(generationId);

  const isBusy = createGeneration.isPending || generationQuery.isFetching;
  const status = generationQuery.data?.status ?? createGeneration.data?.status;

  const onSourceToggle = (sourceId: string, checked: boolean) => {
    setSelectedSourceIds((current) => {
      if (checked) {
        if (current.includes(sourceId)) {
          return current;
        }
        return [...current, sourceId];
      }
      return current.filter((id) => id !== sourceId);
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!projectId) {
      setFormError(t("newsletter.agent.error.projectRequired"));
      return;
    }
    if (!useAllActiveSources && selectedSourceIds.length === 0) {
      setFormError(t("newsletter.agent.error.sourcesRequired"));
      return;
    }

    const parsedMaxSources = maxSources.trim() ? Number(maxSources) : undefined;
    if (parsedMaxSources !== undefined && (!Number.isInteger(parsedMaxSources) || parsedMaxSources <= 0)) {
      setFormError(t("newsletter.agent.error.maxSourcesInvalid"));
      return;
    }

    try {
      const created = await createGeneration.mutateAsync({
        sourceIds: selectedSourceIds,
        useAllActiveSources,
        titleHint: titleHint || undefined,
        topicHint: topicHint || undefined,
        roleProfile,
        writingStyle,
        audience,
        language,
        length,
        structureType,
        callToAction: callToAction || undefined,
        creativityLevel,
        useReferences,
        includeSummary,
        includeConclusions,
        includeTags,
        maxSources: parsedMaxSources
      });
      setGenerationId(created.id);
    } catch (error) {
      setFormError(resolveNewsletterErrorMessage(error, t, "newsletter.agent.error.createFailed"));
    }
  };

  return (
    <section className="panel rounded-2xl p-4 md:p-5">
      <header className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-[#203a64]">{t("newsletter.agent.title")}</h3>
          <p className="mt-1 text-sm text-[#5a7092]">{t("newsletter.agent.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <Button variant="outline" className="whitespace-nowrap">{t("newsletter.actions.syncSources")}</Button>
          <Button className="whitespace-nowrap">{t("newsletter.actions.reviewDrafts")}</Button>
        </div>
      </header>

      <div className="mb-6 mt-2 h-px w-full bg-[linear-gradient(90deg,transparent_0%,#7f98be_5%,#7f98be_95%,transparent_100%)]" aria-hidden="true" />

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-[#274268]">{t("newsletter.agent.project")}</span>
            <div className="relative">
              <select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">{t("newsletter.agent.projectPlaceholder")}</option>
                {(projectsQuery.data ?? []).map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
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
            </div>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-[#274268]">{t("newsletter.agent.maxSources")}</span>
            <input
              type="number"
              min={1}
              value={maxSources}
              onChange={(event) => setMaxSources(event.target.value)}
              placeholder={t("newsletter.agent.maxSourcesPlaceholder")}
              className={CONTROL_CLASS}
            />
          </label>
        </div>

        <fieldset className="rounded-xl border border-[#d4deed] bg-[#f8fbff] p-4">
          <legend className="px-1 text-sm font-semibold text-[#223f67]">{t("newsletter.agent.sources.title")}</legend>
          <label className="mb-3 inline-flex cursor-pointer items-center gap-2 text-sm text-[#29466d]">
            <input
              type="checkbox"
              checked={useAllActiveSources}
              onChange={(event) => setUseAllActiveSources(event.target.checked)}
              className={CHECKBOX_CLASS}
            />
            {t("newsletter.agent.sources.useAll")}
          </label>
          <div className="grid gap-2 md:grid-cols-2">
            {activeSources.map((source) => (
              <label key={source.id} className="inline-flex items-center gap-2 rounded-xl border border-[#bccbe0] bg-white px-3 py-2 text-sm font-medium text-[#2e4a72] shadow-[0_1px_2px_rgba(28,58,96,0.05)] transition hover:border-[#9fb5d6]">
                <input
                  type="checkbox"
                  disabled={useAllActiveSources}
                  checked={selectedSourceIds.includes(source.id)}
                  onChange={(event) => onSourceToggle(source.id, event.target.checked)}
                  className={CHECKBOX_CLASS}
                />
                <span className="truncate">{source.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-[#d4deed] bg-[#f8fbff] p-4">
          <legend className="px-1 text-sm font-semibold text-[#223f67]">{t("newsletter.agent.editorial.title")}</legend>
          <div className="grid gap-3 md:grid-cols-2">
            <InputField label={t("newsletter.agent.editorial.titleHint")} value={titleHint} onChange={setTitleHint} />
            <InputField label={t("newsletter.agent.editorial.topicHint")} value={topicHint} onChange={setTopicHint} />
            <SelectField
              label={t("newsletter.agent.editorial.role")}
              value={roleProfile}
              onChange={setRoleProfile}
              options={ROLE_OPTIONS}
              optionLabelPrefix="newsletter.agent.options.role"
            />
            <SelectField
              label={t("newsletter.agent.editorial.style")}
              value={writingStyle}
              onChange={setWritingStyle}
              options={STYLE_OPTIONS}
              optionLabelPrefix="newsletter.agent.options.style"
            />
            <SelectField
              label={t("newsletter.agent.editorial.audience")}
              value={audience}
              onChange={setAudience}
              options={AUDIENCE_OPTIONS}
              optionLabelPrefix="newsletter.agent.options.audience"
            />
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-[#d4deed] bg-[#f8fbff] p-4">
          <legend className="px-1 text-sm font-semibold text-[#223f67]">{t("newsletter.agent.format.title")}</legend>
          <div className="grid gap-3 md:grid-cols-2">
            <SelectField
              label={t("newsletter.agent.format.language")}
              value={language}
              onChange={setLanguage}
              options={LANGUAGE_OPTIONS}
              optionLabelPrefix="newsletter.agent.options.language"
            />
            <SelectField
              label={t("newsletter.agent.format.length")}
              value={length}
              onChange={setLength}
              options={LENGTH_OPTIONS}
              optionLabelPrefix="newsletter.agent.options.length"
            />
            <SelectField
              label={t("newsletter.agent.format.structure")}
              value={structureType}
              onChange={setStructureType}
              options={STRUCTURE_OPTIONS}
              optionLabelPrefix="newsletter.agent.options.structure"
            />
            <InputField label={t("newsletter.agent.format.cta")} value={callToAction} onChange={setCallToAction} />
          </div>
        </fieldset>

        <details className="group rounded-xl border border-[#d4deed] bg-[#f8fbff]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-[#223f67]">
            <span>{t("newsletter.agent.advanced.title")}</span>
            <svg
              viewBox="0 0 20 20"
              className="h-4 w-4 text-[#48678f] transition-transform group-open:rotate-180"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              aria-hidden="true"
            >
              <path d="m5 7 5 6 5-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <div className="grid gap-3 border-t border-[#d4deed] p-4 md:grid-cols-2">
            <SelectField
              label={t("newsletter.agent.advanced.creativity")}
              value={creativityLevel}
              onChange={setCreativityLevel}
              options={CREATIVITY_OPTIONS}
              optionLabelPrefix="newsletter.agent.options.creativity"
            />
            <ToggleField label={t("newsletter.agent.advanced.useReferences")} checked={useReferences} onChange={setUseReferences} />
            <ToggleField label={t("newsletter.agent.advanced.includeSummary")} checked={includeSummary} onChange={setIncludeSummary} />
            <ToggleField label={t("newsletter.agent.advanced.includeConclusions")} checked={includeConclusions} onChange={setIncludeConclusions} />
            <ToggleField label={t("newsletter.agent.advanced.includeTags")} checked={includeTags} onChange={setIncludeTags} />
          </div>
        </details>

        {formError ? <AlertInline message={formError} /> : null}
        {status ? (
          <div className="rounded-lg border border-[#cad9ed] bg-[#f2f7ff] px-3 py-2 text-sm text-[#244369]">
            <strong>{t("newsletter.agent.status.label")}:</strong> {status}
          </div>
        ) : null}
        {generationQuery.data?.draft ? (
          <div className="rounded-lg border border-[#cad9ed] bg-white px-3 py-3 text-sm text-[#2a476e]">
            <p className="font-semibold text-[#1f3b63]">{generationQuery.data.draft.generatedTitle ?? t("newsletter.agent.draft.noTitle")}</p>
            <p className="mt-1 text-[#5b7092]">{generationQuery.data.draft.generatedSummary ?? t("newsletter.agent.draft.noSummary")}</p>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" className="min-w-[200px]" disabled={isBusy || projectsQuery.isLoading || sourcesQuery.isLoading}>
            {isBusy ? t("newsletter.agent.actions.generating") : t("newsletter.agent.actions.generate")}
          </Button>
        </div>
      </form>
    </section>
  );
}

function InputField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold text-[#274268]">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={CONTROL_CLASS}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  optionLabelPrefix
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  optionLabelPrefix?: string;
}) {
  const t = useT();
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold text-[#274268]">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={SELECT_CLASS}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {optionLabelPrefix ? t(`${optionLabelPrefix}.${option}`) : option}
            </option>
          ))}
        </select>
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
      </div>
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[#29466d]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className={CHECKBOX_CLASS}
      />
      {label}
    </label>
  );
}
