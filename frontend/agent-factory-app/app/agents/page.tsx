"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useT } from "@/components/IntlProviderClient";
import {
  AgentDefinition,
  AgentExportBundle,
  AgentFactoryApiError,
  AgentIndexingJob,
  AssistantTextKey,
  AssistantTexts,
  QuestionTopic,
  SuggestedQuestionsOrder,
  AgentTestResponse,
  createAgent,
  createAgentIndexingJobs,
  deleteAgent,
  fetchAgentExport,
  fetchAgentIndexingJobs,
  fetchAgents,
  fetchKnowledgeBases,
  fetchRepository,
  importAgentBundle,
  KnowledgeBase,
  publishAgent,
  testAgent,
  updateAgent
} from "@/lib/agent-factory-api";
import { GuidedTour, TourHelpButton, useTour, type TourStep } from "@/components/guided-tour";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

const AGENT_FORM_TOUR_STEPS: TourStep[] = [
  { selector: "[data-tour='agent-field-name']", titleKey: "tour.agents.name.title", descriptionKey: "tour.agents.name.description" },
  { selector: "[data-tour='agent-field-description']", titleKey: "tour.agents.description.title", descriptionKey: "tour.agents.description.description" },
  { selector: "[data-tour='agent-field-persona']", titleKey: "tour.agents.persona.title", descriptionKey: "tour.agents.persona.description" },
  { selector: "[data-tour='agent-field-audience']", titleKey: "tour.agents.audience.title", descriptionKey: "tour.agents.audience.description" },
  { selector: "[data-tour='agent-field-tone']", titleKey: "tour.agents.tone.title", descriptionKey: "tour.agents.tone.description" },
  { selector: "[data-tour='agent-field-language']", titleKey: "tour.agents.language.title", descriptionKey: "tour.agents.language.description" },
  { selector: "[data-tour='agent-field-instructions']", titleKey: "tour.agents.instructions.title", descriptionKey: "tour.agents.instructions.description" },
  { selector: "[data-tour='agent-field-suggested']", titleKey: "tour.agents.suggested.title", descriptionKey: "tour.agents.suggested.description" },
  { selector: "[data-tour='agent-field-topics']", titleKey: "tour.agents.topics.title", descriptionKey: "tour.agents.topics.description" },
  { selector: "[data-tour='agent-field-assistant-texts']", titleKey: "tour.agents.assistantTexts.title", descriptionKey: "tour.agents.assistantTexts.description" },
  { selector: "[data-tour='agent-field-knowledge-bases']", titleKey: "tour.agents.knowledgeBases.title", descriptionKey: "tour.agents.knowledgeBases.description" }
];

const AGENT_FIELD_LIMITS = {
  name: 80,
  description: 500,
  persona: 500,
  targetAudience: 300,
  instructions: 900,
  testQuestion: 500,
  suggestedQuestion: 200,
  assistantText: 500
} as const;

const ASSISTANT_TEXT_KEYS: AssistantTextKey[] = ["fallback", "greeting", "thanks", "farewell", "help"];

function cleanAssistantTexts(texts: AssistantTexts): AssistantTexts {
  const result: AssistantTexts = {};
  for (const key of ASSISTANT_TEXT_KEYS) {
    const value = (texts[key] ?? "").trim();
    if (value) {
      result[key] = value;
    }
  }
  return result;
}

function cleanQuestionTopics(topics: QuestionTopic[]): QuestionTopic[] {
  return topics
    .map((topic) => ({
      id: topic.id ?? "",
      label: topic.label.trim(),
      questions: topic.questions.map((question) => question.trim()).filter(Boolean)
    }))
    .filter((topic) => topic.questions.length > 0);
}

export default function AgentsPage() {
  const t = useT();
  const { locale } = useLocale();
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedBases, setSelectedBases] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [persona, setPersona] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [tone, setTone] = useState("professional");
  const [responseLanguage, setResponseLanguage] = useState("auto");
  const [instructions, setInstructions] = useState("");
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [suggestedQuestionsCount, setSuggestedQuestionsCount] = useState(3);
  const [suggestedQuestionsOrder, setSuggestedQuestionsOrder] = useState<SuggestedQuestionsOrder>("random");
  const [questionTopics, setQuestionTopics] = useState<QuestionTopic[]>([]);
  const [assistantTexts, setAssistantTexts] = useState<AssistantTexts>({});
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
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
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const formTour = useTour("agents-form");

  async function exportAgent(agent: AgentDefinition) {
    setExportingId(agent.id);
    setError(null);
    try {
      const bundle = await fetchAgentExport(agent.id);
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${slugifyFileName(agent.name)}.agent.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setExportingId(null);
    }
  }

  async function onImportFilePicked(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const text = await file.text();
      const bundle = JSON.parse(text) as AgentExportBundle;
      const created = await importAgentBundle(bundle);
      setAgents((current) => [created, ...current]);
      setExpandedAgentId(created.id);
    } catch (requestError) {
      setError(requestError instanceof SyntaxError ? new AgentFactoryApiError(400, "error.agentImportInvalid") : requestError);
    } finally {
      setImporting(false);
    }
  }

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
        persona: persona.trim(),
        targetAudience: targetAudience.trim(),
        tone,
        responseLanguage,
        instructions: instructions.trim(),
        suggestedQuestions: suggestedQuestions.map((question) => question.trim()).filter(Boolean),
        assistantTexts: cleanAssistantTexts(assistantTexts),
        suggestedQuestionsCount,
        suggestedQuestionsOrder,
        questionTopics: cleanQuestionTopics(questionTopics),
        knowledgeBaseIds: selectedBases
      };
      if (editingAgentId) {
        const updated = await updateAgent(editingAgentId, payload);
        setAgents((current) => current.map((agent) => agent.id === editingAgentId ? updated : agent));
        setExpandedAgentId(updated.id);
      } else {
        const created = await createAgent(payload);
        setAgents((current) => [created, ...current]);
        setExpandedAgentId(created.id);
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
    setExpandedAgentId(agent.id);
    setName(agent.name);
    setDescription(agent.description ?? "");
    setPersona(agent.persona ?? "");
    setTargetAudience(agent.targetAudience ?? "");
    setTone(agent.tone ?? "professional");
    setResponseLanguage(agent.responseLanguage ?? "auto");
    setInstructions(agent.instructions ?? "");
    setSuggestedQuestions(agent.suggestedQuestions ?? []);
    setSuggestedQuestionsCount(agent.suggestedQuestionsCount ?? 3);
    setSuggestedQuestionsOrder(agent.suggestedQuestionsOrder ?? "random");
    setQuestionTopics(agent.questionTopics ?? []);
    setAssistantTexts(agent.assistantTexts ?? {});
    setSelectedBases(agent.knowledgeBaseIds ?? []);
    setError(null);
  }

  function resetForm() {
    setEditingAgentId(null);
    setName("");
    setDescription("");
    setPersona("");
    setTargetAudience("");
    setTone("professional");
    setResponseLanguage("auto");
    setInstructions("");
    setSuggestedQuestions([]);
    setSuggestedQuestionsCount(3);
    setSuggestedQuestionsOrder("random");
    setQuestionTopics([]);
    setAssistantTexts({});
    setSelectedBases([]);
  }

  async function remove() {
    if (!agentToDelete) return;
    setDeletingId(agentToDelete.id);
    setError(null);
    try {
      await deleteAgent(agentToDelete.id);
      setAgents((current) => current.filter((item) => item.id !== agentToDelete.id));
      setExpandedAgentId((current) => current === agentToDelete.id ? null : current);
      setAgentToDelete(null);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setDeletingId(null);
    }
  }

  async function publish(agent: AgentDefinition) {
    setPublishingId(agent.id);
    setExpandedAgentId(agent.id);
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
    setExpandedAgentId(agent.id);
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
    setExpandedAgentId(agent.id);
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

  function toggleAgent(agentId: string) {
    setExpandedAgentId((current) => current === agentId ? null : agentId);
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
        <div className="intro-card-actions">
          <input
            ref={importFileInputRef}
            type="file"
            accept="application/json"
            hidden
            onChange={onImportFilePicked}
            disabled={importing}
          />
          <button
            type="button"
            className="small-action"
            onClick={() => importFileInputRef.current?.click()}
            disabled={importing}
            title={t("agents.importHint")}
          >
            {importing ? t("agents.importing") : t("agents.importAction")}
          </button>
          <span className="phase-badge">{t("agents.statusDraft")}</span>
        </div>
      </section>

      {error ? <div className="alert error" role="alert"><strong>{t("operation.failedTitle")}</strong><span>{messageOf(error, t)}</span></div> : null}

      <section className="knowledge-layout">
        <form className="knowledge-form" onSubmit={submit}>
          <div>
            <span className="eyebrow">{t("agents.createEyebrow")}</span>
            <div className="section-heading-inline">
              <h2>{t(editingAgentId ? "agents.editTitle" : "agents.createTitle")}</h2>
              <TourHelpButton onClick={formTour.restart} label={t("tour.agents.helpButton")} />
            </div>
            <p>{t(editingAgentId ? "agents.editDescription" : "agents.createDescription")}</p>
          </div>
          <label className="form-field" data-tour="agent-field-name">
            <span className="field-label">
              {t("agents.nameLabel")} <span className="req" aria-hidden="true">*</span>
              <span className="field-help" tabIndex={0} aria-label={t("agents.namePlaceholder")} title={t("agents.namePlaceholder")}>?</span>
            </span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("agents.namePlaceholder")} maxLength={AGENT_FIELD_LIMITS.name} required aria-required="true" />
            <FieldLimit value={name} max={AGENT_FIELD_LIMITS.name} />
          </label>
          <label className="form-field" data-tour="agent-field-description">
            <span className="field-label">
              {t("agents.descriptionLabel")}
              <span className="field-help" tabIndex={0} aria-label={t("agents.descriptionPlaceholder")} title={t("agents.descriptionPlaceholder")}>?</span>
            </span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("agents.descriptionPlaceholder")} maxLength={AGENT_FIELD_LIMITS.description} />
            <FieldLimit value={description} max={AGENT_FIELD_LIMITS.description} />
          </label>
          <label className="form-field" data-tour="agent-field-persona">
            <span className="field-label">
              {t("agents.personaLabel")} <span className="req" aria-hidden="true">*</span>
              <span className="field-help" tabIndex={0} aria-label={t("agents.personaHelp")} title={t("agents.personaHelp")}>?</span>
            </span>
            <textarea value={persona} onChange={(event) => setPersona(event.target.value)} placeholder={t("agents.personaPlaceholder")} maxLength={AGENT_FIELD_LIMITS.persona} required aria-required="true" />
            <FieldLimit value={persona} max={AGENT_FIELD_LIMITS.persona} />
          </label>
          <label className="form-field" data-tour="agent-field-audience">
            <span className="field-label">
              {t("agents.targetAudienceLabel")} <span className="req" aria-hidden="true">*</span>
              <span className="field-help" tabIndex={0} aria-label={t("agents.targetAudienceHelp")} title={t("agents.targetAudienceHelp")}>?</span>
            </span>
            <input value={targetAudience} onChange={(event) => setTargetAudience(event.target.value)} placeholder={t("agents.targetAudiencePlaceholder")} maxLength={AGENT_FIELD_LIMITS.targetAudience} required aria-required="true" />
            <FieldLimit value={targetAudience} max={AGENT_FIELD_LIMITS.targetAudience} />
          </label>
          <div className="form-split">
            <label className="form-field" data-tour="agent-field-tone">
              <span className="field-label">
                {t("agents.toneLabel")}
                <span className="field-help" tabIndex={0} aria-label={t("agents.toneHelp")} title={t("agents.toneHelp")}>?</span>
              </span>
              <select value={tone} onChange={(event) => setTone(event.target.value)}>
                {["professional", "friendly", "technical", "concise"].map((option) => (
                  <option key={option} value={option}>{t(`agents.tone.${option}`)}</option>
                ))}
              </select>
            </label>
            <label className="form-field" data-tour="agent-field-language">
              <span className="field-label">
                {t("agents.responseLanguageLabel")}
                <span className="field-help" tabIndex={0} aria-label={t("agents.responseLanguageHelp")} title={t("agents.responseLanguageHelp")}>?</span>
              </span>
              <select value={responseLanguage} onChange={(event) => setResponseLanguage(event.target.value)}>
                {["auto", "es", "en"].map((option) => (
                  <option key={option} value={option}>{t(`agents.responseLanguage.${option}`)}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="form-field" data-tour="agent-field-instructions">
            <span className="field-label">
              {t("agents.instructionsLabel")}
              <span className="field-help" tabIndex={0} aria-label={t("agents.instructionsPlaceholder")} title={t("agents.instructionsPlaceholder")}>?</span>
            </span>
            <textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder={t("agents.instructionsPlaceholder")} maxLength={AGENT_FIELD_LIMITS.instructions} />
            <FieldLimit value={instructions} max={AGENT_FIELD_LIMITS.instructions} />
          </label>

          <div className="form-field" data-tour="agent-field-suggested">
            <span className="field-label">
              {t("agents.suggestedQuestionsLabel")}
              <span className="field-help" tabIndex={0} aria-label={t("agents.suggestedQuestionsHelp")} title={t("agents.suggestedQuestionsHelp")}>?</span>
            </span>
            <small className="field-hint">{t("agents.suggestedQuestionsHint")}</small>
            <div className="suggested-questions">
              {suggestedQuestions.map((question, index) => (
                <div className="suggested-question-row" key={index}>
                  <input
                    value={question}
                    onChange={(event) => setSuggestedQuestions((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
                    placeholder={t("agents.suggestedQuestionPlaceholder")}
                    maxLength={AGENT_FIELD_LIMITS.suggestedQuestion}
                  />
                  <button
                    type="button"
                    className="icon-button danger"
                    onClick={() => setSuggestedQuestions((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    aria-label={t("agents.suggestedQuestionRemove")}
                    title={t("agents.suggestedQuestionRemove")}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                  </button>
                </div>
              ))}
              <button type="button" className="secondary-button" onClick={() => setSuggestedQuestions((current) => [...current, ""])}>
                {t("agents.suggestedQuestionAdd")}
              </button>
            </div>
            {suggestedQuestions.filter((question) => question.trim()).length > 1 ? (
              <div className="suggested-questions-display">
                <label className="form-field compact">
                  <span className="field-label">{t("agents.suggestedQuestionsCountLabel")}</span>
                  <input
                    type="number"
                    min={1}
                    max={suggestedQuestions.filter((question) => question.trim()).length}
                    value={suggestedQuestionsCount}
                    onChange={(event) => setSuggestedQuestionsCount(Math.max(1, Number(event.target.value) || 1))}
                  />
                </label>
                <label className="form-field compact">
                  <span className="field-label">{t("agents.suggestedQuestionsOrderLabel")}</span>
                  <select value={suggestedQuestionsOrder} onChange={(event) => setSuggestedQuestionsOrder(event.target.value as SuggestedQuestionsOrder)}>
                    <option value="random">{t("agents.suggestedQuestionsOrder.random")}</option>
                    <option value="fixed">{t("agents.suggestedQuestionsOrder.fixed")}</option>
                  </select>
                </label>
              </div>
            ) : null}
          </div>

          <div className="form-field" data-tour="agent-field-topics">
            <span className="field-label">
              {t("agents.questionTopicsLabel")}
              <span className="field-help" tabIndex={0} aria-label={t("agents.questionTopicsHelp")} title={t("agents.questionTopicsHelp")}>?</span>
            </span>
            <small className="field-hint">{t("agents.questionTopicsHint")}</small>
            <div className="question-topics">
              {questionTopics.map((topic, topicIndex) => (
                <div className="question-topic" key={topicIndex}>
                  <div className="question-topic-head">
                    <input
                      value={topic.label}
                      onChange={(event) => setQuestionTopics((current) => current.map((item, index) => index === topicIndex ? { ...item, label: event.target.value } : item))}
                      placeholder={t("agents.questionTopicLabelPlaceholder")}
                      maxLength={60}
                    />
                    <button
                      type="button"
                      className="icon-button danger"
                      onClick={() => setQuestionTopics((current) => current.filter((_, index) => index !== topicIndex))}
                      aria-label={t("agents.questionTopicRemove")}
                      title={t("agents.questionTopicRemove")}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                    </button>
                  </div>
                  <div className="suggested-questions">
                    {topic.questions.map((question, questionIndex) => (
                      <div className="suggested-question-row" key={questionIndex}>
                        <input
                          value={question}
                          onChange={(event) => setQuestionTopics((current) => current.map((item, index) => index === topicIndex
                            ? { ...item, questions: item.questions.map((q, qi) => qi === questionIndex ? event.target.value : q) }
                            : item))}
                          placeholder={t("agents.suggestedQuestionPlaceholder")}
                          maxLength={AGENT_FIELD_LIMITS.suggestedQuestion}
                        />
                        <button
                          type="button"
                          className="icon-button danger"
                          onClick={() => setQuestionTopics((current) => current.map((item, index) => index === topicIndex
                            ? { ...item, questions: item.questions.filter((_, qi) => qi !== questionIndex) }
                            : item))}
                          aria-label={t("agents.suggestedQuestionRemove")}
                          title={t("agents.suggestedQuestionRemove")}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setQuestionTopics((current) => current.map((item, index) => index === topicIndex
                        ? { ...item, questions: [...item.questions, ""] }
                        : item))}
                    >
                      {t("agents.suggestedQuestionAdd")}
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="secondary-button"
                onClick={() => setQuestionTopics((current) => [...current, { id: "", label: "", questions: [""] }])}
              >
                {t("agents.questionTopicAdd")}
              </button>
            </div>
          </div>

          <details className="assistant-texts" data-tour="agent-field-assistant-texts">
            <summary>{t("agents.assistantTextsLabel")}</summary>
            <small className="field-hint">{t("agents.assistantTextsHint")}</small>
            {ASSISTANT_TEXT_KEYS.map((key) => (
              <label className="form-field" key={key}>
                <span className="field-label">{t(`agents.assistantText.${key}`)}</span>
                <textarea
                  value={assistantTexts[key] ?? ""}
                  onChange={(event) => setAssistantTexts((current) => ({ ...current, [key]: event.target.value }))}
                  placeholder={t(`agents.assistantTextPlaceholder.${key}`)}
                  maxLength={AGENT_FIELD_LIMITS.assistantText}
                />
              </label>
            ))}
          </details>

          <div className="document-picker" data-tour="agent-field-knowledge-bases">
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
          <p className="form-required-note">{t("common.requiredFields")}</p>
          <div className="form-actions">
            {editingAgentId ? (
              <button className="secondary-button" type="button" onClick={resetForm} disabled={saving}>{t("common.cancel")}</button>
            ) : null}
            <button className="primary-button" type="submit" disabled={saving || !name.trim() || !persona.trim() || !targetAudience.trim()}>
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
              {agents.map((agent) => {
                const expanded = expandedAgentId === agent.id;
                return (
                  <article className={`knowledge-item agent-inventory-item ${expanded ? "expanded" : "collapsed"} ${isAgentReadyToTest(agent, indexingJobsByAgent[agent.id]) ? "ready-to-test" : ""}`} key={agent.id}>
                    <div className="agent-inventory-header">
                      <button
                        className="agent-toggle"
                        type="button"
                        onClick={() => toggleAgent(agent.id)}
                        aria-expanded={expanded}
                        aria-controls={`agent-panel-${agent.id}`}
                      >
                        <span className="agent-toggle-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24"><path d="m8 10 4 4 4-4" /></svg>
                        </span>
                        <span className="agent-toggle-copy">
                          <span className={`agent-lifecycle-badge ${agentLifecycleState(agent, indexingJobsByAgent[agent.id])}`}>
                            {agentLifecycleLabel(agent, indexingJobsByAgent[agent.id], t)}
                          </span>
                          <strong>{agent.name}</strong>
                          <small>{agent.description || t("agents.noDescription")}</small>
                        </span>
                      </button>
                      <div className="agent-collapsed-meta">
                        <strong>{t("agents.knowledgeBaseCount", { count: agent.knowledgeBaseCount })}</strong>
                        <span>{agent.knowledgeBaseNames.slice(0, 2).join(", ") || t("agents.noLinkedBases")}</span>
                      </div>
                    </div>

                    {expanded ? (
                      <div className="agent-expanded-panel" id={`agent-panel-${agent.id}`}>
                        <div>
                          <div className="agent-context-profile">
                            <span>{t("agents.personaSummary", { value: agent.persona || t("common.notAvailable") })}</span>
                            <span>{t("agents.audienceSummary", { value: agent.targetAudience || t("common.notAvailable") })}</span>
                            <span>{t("agents.toneSummary", { value: t(`agents.tone.${agent.tone || "professional"}`) })}</span>
                            <span>{t("agents.languageSummary", { value: t(`agents.responseLanguage.${agent.responseLanguage || "auto"}`) })}</span>
                          </div>
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
                            <button
                              className="icon-button"
                              type="button"
                              onClick={() => exportAgent(agent)}
                              disabled={exportingId === agent.id}
                              aria-label={t("agents.export", { name: agent.name })}
                              title={t("agents.export", { name: agent.name })}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
                            </button>
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
                                maxLength={AGENT_FIELD_LIMITS.testQuestion}
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
                      </div>
                    ) : null}
                  </article>
                );
              })}
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
      <GuidedTour open={formTour.open} steps={AGENT_FORM_TOUR_STEPS} onClose={formTour.close} />
    </div>
  );
}

function FieldLimit({ value, max }: { value: string; max: number }) {
  return <small className="field-limit">{value.length}/{max}</small>;
}

function messageOf(error: unknown, t: Translate): string {
  if (error instanceof AgentFactoryApiError) return t(error.code, error.variables);
  return t("common.unexpectedError");
}

function slugifyFileName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "agente";
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

function agentLifecycleState(agent: AgentDefinition, jobs: AgentIndexingJob[] | undefined): string {
  if (isKnowledgeUpToDate(agent, jobs)) return "indexed";
  if (agent.status === "READY") return "ready-unindexed";
  return "created-unindexed";
}

function agentLifecycleLabel(agent: AgentDefinition, jobs: AgentIndexingJob[] | undefined, t: Translate): string {
  if (isKnowledgeUpToDate(agent, jobs)) return t("agents.lifecycle.readyIndexed");
  if (agent.status === "READY") return t("agents.lifecycle.readyUnindexed");
  return t("agents.lifecycle.createdUnindexed");
}
