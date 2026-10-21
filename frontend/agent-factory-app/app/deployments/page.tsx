"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useT } from "@/components/IntlProviderClient";
import {
  AgentDefinition,
  AgentDeployment,
  AgentFactoryApiError,
  createDeployment,
  deleteDeployment,
  DeploymentChannelType,
  DeploymentStatus,
  fetchAgents,
  fetchDeployments,
  fetchWorkspaceTestDeployment,
  regenerateDeploymentPublicId,
  updateDeployment
} from "@/lib/agent-factory-api";
import { GuidedTour, TourHelpButton, useTour, type TourStep } from "@/components/guided-tour";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

const DEPLOYMENT_FORM_TOUR_STEPS: TourStep[] = [
  { selector: "[data-tour='deployment-field-agent']", titleKey: "tour.deployments.agent.title", descriptionKey: "tour.deployments.agent.description" },
  { selector: "[data-tour='deployment-field-name']", titleKey: "tour.deployments.name.title", descriptionKey: "tour.deployments.name.description" },
  { selector: "[data-tour='deployment-field-channel']", titleKey: "tour.deployments.channel.title", descriptionKey: "tour.deployments.channel.description" },
  { selector: "[data-tour='deployment-field-slug']", titleKey: "tour.deployments.slug.title", descriptionKey: "tour.deployments.slug.description" },
  { selector: "[data-tour='deployment-field-welcome']", titleKey: "tour.deployments.welcome.title", descriptionKey: "tour.deployments.welcome.description" },
  { selector: "[data-tour='deployment-field-rate-limits']", titleKey: "tour.deployments.rateLimits.title", descriptionKey: "tour.deployments.rateLimits.description" },
  { selector: "[data-tour='deployment-field-origins']", titleKey: "tour.deployments.origins.title", descriptionKey: "tour.deployments.origins.description" },
  { selector: "[data-tour='deployment-field-test-chat']", titleKey: "tour.deployments.testChat.title", descriptionKey: "tour.deployments.testChat.description" },
  { selector: "[data-tour='deployment-status-badge']", titleKey: "tour.deployments.statusBadge.title", descriptionKey: "tour.deployments.statusBadge.description" },
  { selector: "[data-tour='deployment-list-toggle']", titleKey: "tour.deployments.listToggle.title", descriptionKey: "tour.deployments.listToggle.description" }
];

type FormState = {
  agentId: string;
  name: string;
  channelType: DeploymentChannelType;
  deploymentSlug: string;
  status: DeploymentStatus;
  apiKey: string;
  welcomeMessage: string;
  rateLimitPerMinute: string;
  rateLimitPerDay: string;
  allowedOrigins: string;
};

const emptyForm: FormState = {
  agentId: "",
  name: "",
  channelType: "WEB_CHAT",
  deploymentSlug: "",
  status: "ACTIVE",
  apiKey: "",
  welcomeMessage: "",
  rateLimitPerMinute: "",
  rateLimitPerDay: "",
  allowedOrigins: ""
};

export default function DeploymentsPage() {
  const t = useT();
  const { locale } = useLocale();
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [deployments, setDeployments] = useState<AgentDeployment[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deploymentToDelete, setDeploymentToDelete] = useState<AgentDeployment | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [publishWithoutOrigins, setPublishWithoutOrigins] = useState<AgentDeployment | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const formTour = useTour("deployments-form");

  type TestChatTarget = { key: string; publicId: string } | { key: string; agentId: string };
  const [testChatTarget, setTestChatTarget] = useState<TestChatTarget | null>(null);
  const [testChatLoading, setTestChatLoading] = useState(false);
  const [testChatError, setTestChatError] = useState<unknown>(null);
  const testChatScriptRef = useRef<HTMLScriptElement | null>(null);
  // Confinamos el widget real (sin tocar su script) dentro de esta caja:
  // el DOM real de su ventana se reubica adentro y se fuerza a
  // "position: absolute" respecto a ella. La caja empieza del tamaño de la
  // sola burbuja (ínfimo) y solo crece al tamaño de la ventana MIENTRAS esta
  // está realmente abierta -- si se quedara siempre al tamaño máximo de la
  // ventana (hasta 640px de alto) taparía toda la lista de despliegues
  // aunque el widget esté cerrado, que es justo lo que queremos evitar.
  const testChatStageRef = useRef<HTMLDivElement>(null);
  const testChatObserverRef = useRef<MutationObserver | null>(null);

  function toggleExpanded(id: string) {
    setExpandedId((current) => (current === id ? null : id));
  }

  function teardownTestChat() {
    testChatObserverRef.current?.disconnect();
    testChatObserverRef.current = null;
    testChatStageRef.current?.classList.remove("open");
    document.querySelectorAll("[data-ametis-widget-host]").forEach((node) => node.remove());
    testChatScriptRef.current?.remove();
    testChatScriptRef.current = null;
  }

  /**
   * Abre (o cierra, si ya está abierto ese mismo destino) el chat de prueba
   * en vivo. Se puede disparar desde el formulario (el despliegue que se
   * está editando, o el despliegue de prueba fijo si es uno nuevo sin
   * guardar) o directamente desde la tarjeta de cualquier despliegue ya
   * publicado -- en ese caso usa siempre SU config real guardada.
   */
  async function openTestChat(target: TestChatTarget) {
    if (testChatTarget?.key === target.key) {
      teardownTestChat();
      setTestChatTarget(null);
      setTestChatError(null);
      return;
    }
    setTestChatLoading(true);
    setTestChatError(null);
    try {
      const publicId = "publicId" in target ? target.publicId : (await fetchWorkspaceTestDeployment(target.agentId)).publicId;
      teardownTestChat();
      const apiBase = process.env.NEXT_PUBLIC_AGENT_FACTORY_API_BASE_URL ?? "http://localhost:8440";
      const publicBase = `${apiBase}/api/agent-factory/public`;
      // widget.js se sirve con cache-control público de 10 min (para no
      // recargarlo en cada visita en producción); acá lo evitamos con un
      // parámetro de versión, para no probar nunca una copia vieja cacheada
      // mientras seguimos ajustando el widget en desarrollo.
      const script = document.createElement("script");
      script.src = `${publicBase}/widget.js?v=${Date.now()}`;
      script.async = true;
      script.dataset.deployment = publicId;
      script.dataset.endpoint = publicBase;
      script.dataset.locale = document.documentElement.lang || "es";
      // El widget siempre se autoancla a document.body al montarse (así
      // funciona en cualquier web de cliente), con su burbuja/ventana en
      // "position: fixed" respecto a TODA la ventana. En cuanto termina de
      // cargar y montarse: (1) lo reubicamos (el mismo nodo real, con su
      // Shadow DOM intacto -- no se recarga ni pierde estado) dentro de
      // nuestra caja acotada; (2) forzamos su elemento raíz interno a
      // "position: absolute" para que quede anclado de verdad a esa caja en
      // vez de a la ventana completa; y (3) observamos si su ventana de
      // conversación está abierta o cerrada, para que la caja crezca o se
      // achique con ella. No se toca el archivo del widget -- es un ajuste
      // de estilo desde afuera, sobre el DOM ya renderizado.
      script.addEventListener("load", () => {
        const host = document.querySelector("[data-ametis-widget-host]") as HTMLElement | null;
        const stage = testChatStageRef.current;
        if (!host || !stage) return;
        stage.appendChild(host);
        const shadow = host.shadowRoot;
        const widgetRoot = shadow?.querySelector<HTMLElement>(".root");
        if (widgetRoot) widgetRoot.style.position = "absolute";
        const windowEl = shadow?.querySelector<HTMLElement>(".window");
        if (windowEl) {
          const syncOpenState = () => stage.classList.toggle("open", windowEl.classList.contains("open"));
          syncOpenState();
          const observer = new MutationObserver(syncOpenState);
          observer.observe(windowEl, { attributes: true, attributeFilter: ["class"] });
          testChatObserverRef.current = observer;
        }
      });
      document.body.appendChild(script);
      testChatScriptRef.current = script;
      setTestChatTarget(target);
    } catch (requestError) {
      setTestChatError(requestError);
      setError(requestError);
      setTestChatTarget(null);
    } finally {
      setTestChatLoading(false);
    }
  }

  const formTestChatKey = editingId ? `deployment:${editingId}` : form.agentId ? `agent:${form.agentId}` : null;

  function openFormTestChat() {
    if (editingId) {
      const editing = deployments.find((item) => item.id === editingId);
      if (editing) openTestChat({ key: `deployment:${editing.id}`, publicId: editing.publicId });
      return;
    }
    if (form.agentId) openTestChat({ key: `agent:${form.agentId}`, agentId: form.agentId });
  }

  useEffect(() => teardownTestChat, []);

  async function copyText(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1500);
    } catch {
      /* clipboard no disponible: se ignora */
    }
  }

  async function regeneratePublicId(deployment: AgentDeployment) {
    setRegeneratingId(deployment.id);
    setError(null);
    try {
      const updated = await regenerateDeploymentPublicId(deployment.id);
      setDeployments((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (requestError) {
      setError(requestError);
    } finally {
      setRegeneratingId(null);
    }
  }

  const readyAgents = useMemo(() => agents.filter((agent) => agent.status === "READY"), [agents]);

  async function applyStatus(deployment: AgentDeployment, status: DeploymentStatus) {
    setTogglingId(deployment.id);
    setError(null);
    try {
      const updated = await updateDeployment(deployment.id, {
        agentId: deployment.agentId,
        name: deployment.name,
        channelType: deployment.channelType,
        deploymentSlug: deployment.deploymentSlug,
        status,
        welcomeMessage: deployment.welcomeMessage || undefined,
        rateLimitPerMinute: deployment.rateLimitPerMinute ?? undefined,
        rateLimitPerDay: deployment.rateLimitPerDay ?? undefined,
        allowedOrigins: deployment.allowedOrigins
      });
      setDeployments((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (requestError) {
      setError(requestError);
    } finally {
      setTogglingId(null);
    }
  }

  function togglePublish(deployment: AgentDeployment) {
    if (deployment.status === "ACTIVE") {
      applyStatus(deployment, "INACTIVE");
      return;
    }
    if (!deployment.allowedOrigins?.length) {
      setPublishWithoutOrigins(deployment);
      return;
    }
    applyStatus(deployment, "ACTIVE");
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [currentAgents, currentDeployments] = await Promise.all([
        fetchAgents(),
        fetchDeployments()
      ]);
      setAgents(currentAgents);
      setDeployments(currentDeployments);
      setForm((current) => ({
        ...current,
        agentId: current.agentId || currentAgents.find((agent) => agent.status === "READY")?.id || ""
      }));
    } catch (requestError) {
      setError(requestError);
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
      const payload = {
        agentId: form.agentId,
        name: form.name.trim(),
        channelType: form.channelType,
        deploymentSlug: form.deploymentSlug.trim(),
        status: form.status,
        apiKey: form.apiKey.trim() || undefined,
        welcomeMessage: form.welcomeMessage.trim() || undefined,
        rateLimitPerMinute: parseLimit(form.rateLimitPerMinute),
        rateLimitPerDay: parseLimit(form.rateLimitPerDay),
        allowedOrigins: parseOrigins(form.allowedOrigins)
      };
      if (editingId) {
        const updated = await updateDeployment(editingId, payload);
        setDeployments((current) => current.map((item) => item.id === updated.id ? updated : item));
      } else {
        const created = await createDeployment(payload);
        setDeployments((current) => [created, ...current]);
      }
      resetForm();
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deploymentToDelete) return;
    setDeletingId(deploymentToDelete.id);
    setError(null);
    try {
      await deleteDeployment(deploymentToDelete.id);
      setDeployments((current) => current.filter((item) => item.id !== deploymentToDelete.id));
      setDeploymentToDelete(null);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setDeletingId(null);
    }
  }

  function edit(deployment: AgentDeployment) {
    setEditingId(deployment.id);
    setForm({
      agentId: deployment.agentId,
      name: deployment.name,
      channelType: deployment.channelType,
      deploymentSlug: deployment.deploymentSlug,
      status: deployment.status,
      apiKey: "",
      welcomeMessage: deployment.welcomeMessage || "",
      rateLimitPerMinute: deployment.rateLimitPerMinute != null ? String(deployment.rateLimitPerMinute) : "",
      rateLimitPerDay: deployment.rateLimitPerDay != null ? String(deployment.rateLimitPerDay) : "",
      allowedOrigins: (deployment.allowedOrigins ?? []).join("\n")
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      agentId: readyAgents[0]?.id || ""
    });
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
      deploymentSlug: key === "name" && !editingId ? slugify(String(value)) : current.deploymentSlug
    }));
  }

  if (loading) {
    return <section className="loading-card" role="status"><span className="spinner" aria-hidden="true" />{t("deployments.loading")}</section>;
  }

  return (
    <div className="page-grid">
      <section className="intro-card">
        <div>
          <span className="eyebrow blue">{t("deployments.phase")}</span>
          <h2>{t("deployments.title")}</h2>
          <p>{t("deployments.description")}</p>
        </div>
        <span className="phase-badge">{t("deployments.statusDraft")}</span>
      </section>

      {error ? <div className="alert error" role="alert"><strong>{t("operation.failedTitle")}</strong><span>{messageOf(error, t)}</span></div> : null}

      <section className="knowledge-layout deployments-layout">
        <form className="knowledge-form" onSubmit={submit}>
          <div>
            <span className="eyebrow">{t("deployments.createEyebrow")}</span>
            <div className="section-heading-inline">
              <h2>{t(editingId ? "deployments.editTitle" : "deployments.createTitle")}</h2>
              <TourHelpButton onClick={formTour.restart} label={t("tour.deployments.helpButton")} />
            </div>
            <p>{t(editingId ? "deployments.editDescription" : "deployments.createDescription")}</p>
          </div>
          <label className="form-field" data-tour="deployment-field-agent">
            <span className="field-label">
              {t("deployments.agentLabel")} <span className="req" aria-hidden="true">*</span>
              <span className="field-help" tabIndex={0} aria-label={t("deployments.agentHelp")} title={t("deployments.agentHelp")}>?</span>
            </span>
            <select value={form.agentId} onChange={(event) => setField("agentId", event.target.value)} required aria-required="true">
              <option value="">{t("deployments.agentPlaceholder")}</option>
              {readyAgents.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
          </label>
          {!readyAgents.length ? <p className="muted-copy">{t("deployments.noReadyAgents")}</p> : null}

          <label className="form-field" data-tour="deployment-field-name">
            <span className="field-label">
              {t("deployments.nameLabel")} <span className="req" aria-hidden="true">*</span>
              <span className="field-help" tabIndex={0} aria-label={t("deployments.nameHelp")} title={t("deployments.nameHelp")}>?</span>
            </span>
            <input value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder={t("deployments.namePlaceholder")} required aria-required="true" />
          </label>
          <label className="form-field" data-tour="deployment-field-channel">
            <span className="field-label">
              {t("deployments.channelLabel")}
              <span className="field-help" tabIndex={0} aria-label={t("deployments.channelHelp")} title={t("deployments.channelHelp")}>?</span>
            </span>
            <select value={form.channelType} onChange={(event) => setField("channelType", event.target.value as DeploymentChannelType)}>
              <option value="WEB_CHAT">{t("deployments.channel.web_chat")}</option>
            </select>
            <small className="field-limit">{t("deployments.channelSoon")}</small>
          </label>
          <label className="form-field" data-tour="deployment-field-slug">
            <span className="field-label">
              {t("deployments.slugLabel")} <span className="req" aria-hidden="true">*</span>
              <span className="field-help" tabIndex={0} aria-label={t("deployments.slugHelp")} title={t("deployments.slugHelp")}>?</span>
            </span>
            <input value={form.deploymentSlug} onChange={(event) => setField("deploymentSlug", slugify(event.target.value))} placeholder={t("deployments.slugPlaceholder")} required aria-required="true" />
            <small className="field-limit">{t("deployments.slugHint")}</small>
          </label>
          {form.channelType !== "WEB_CHAT" ? (
            <label className="form-field">
              <span className="field-label">
                {t("deployments.apiKeyLabel")}
                <span className="field-help" tabIndex={0} aria-label={t("deployments.apiKeyHelp")} title={t("deployments.apiKeyHelp")}>?</span>
              </span>
              <input value={form.apiKey} onChange={(event) => setField("apiKey", event.target.value)} placeholder={editingId ? t("deployments.apiKeyEditPlaceholder") : t("deployments.apiKeyPlaceholder")} />
            </label>
          ) : null}
          <label className="form-field" data-tour="deployment-field-welcome">
            <span className="field-label">
              {t("deployments.welcomeMessageLabel")}
              <span className="field-help" tabIndex={0} aria-label={t("deployments.welcomeMessageHelp")} title={t("deployments.welcomeMessageHelp")}>?</span>
            </span>
            <textarea value={form.welcomeMessage} onChange={(event) => setField("welcomeMessage", event.target.value)} placeholder={t("deployments.welcomeMessagePlaceholder")} maxLength={500} />
          </label>
          <div className="form-split" data-tour="deployment-field-rate-limits">
            <label className="form-field">
              <span className="field-label">
                {t("deployments.rateLimitMinuteLabel")}
                <span className="field-help" tabIndex={0} aria-label={t("deployments.rateLimitMinuteHelp")} title={t("deployments.rateLimitMinuteHelp")}>?</span>
              </span>
              <input type="number" min={1} inputMode="numeric" value={form.rateLimitPerMinute} onChange={(event) => setField("rateLimitPerMinute", event.target.value)} placeholder={t("deployments.rateLimitPlaceholder")} />
            </label>
            <label className="form-field">
              <span className="field-label">
                {t("deployments.rateLimitDayLabel")}
                <span className="field-help" tabIndex={0} aria-label={t("deployments.rateLimitDayHelp")} title={t("deployments.rateLimitDayHelp")}>?</span>
              </span>
              <input type="number" min={1} inputMode="numeric" value={form.rateLimitPerDay} onChange={(event) => setField("rateLimitPerDay", event.target.value)} placeholder={t("deployments.rateLimitPlaceholder")} />
            </label>
          </div>
          <label className="form-field" data-tour="deployment-field-origins">
            <span className="field-label">
              {t("deployments.allowedOriginsLabel")}
              <span className="field-help" tabIndex={0} aria-label={t("deployments.allowedOriginsHelp")} title={t("deployments.allowedOriginsHelp")}>?</span>
            </span>
            <textarea value={form.allowedOrigins} onChange={(event) => setField("allowedOrigins", event.target.value)} placeholder={t("deployments.allowedOriginsPlaceholder")} rows={3} />
            <small className="field-limit">{t("deployments.allowedOriginsHint")}</small>
          </label>
          {editingId ? <p className="muted-copy">{t("deployments.statusHelp")}</p> : null}

          <div className="test-chat-toggle-row" data-tour="deployment-field-test-chat">
            <button
              type="button"
              className={`toggle-switch ${testChatTarget?.key === formTestChatKey ? "on" : ""}`}
              role="switch"
              aria-checked={testChatTarget?.key === formTestChatKey}
              onClick={openFormTestChat}
              disabled={!form.agentId || testChatLoading}
            >
              <span className="toggle-switch-track" aria-hidden="true" />
              <span className="toggle-switch-label">{t(testChatTarget?.key === formTestChatKey ? "deployments.testChatOn" : "deployments.testChatOff")}</span>
            </button>
            {testChatLoading ? <small className="muted-copy">{t("deployments.testChatLoading")}</small> : null}
          </div>
          {!form.agentId ? (
            <div className="alert warning compact" role="status">
              <span aria-hidden="true">⚠️</span>
              <span>{t("deployments.testChatRequiresAgent")}</span>
            </div>
          ) : (
            <p className="muted-copy">{t("deployments.testChatHelp")}</p>
          )}
          {testChatError ? <div className="alert error compact" role="alert"><span>{messageOf(testChatError, t)}</span></div> : null}

          <p className="form-required-note">{t("common.requiredFields")}</p>
          <div className="form-actions">
            {editingId ? <button className="secondary-button" type="button" onClick={resetForm} disabled={saving}>{t("common.cancel")}</button> : null}
            <button className="primary-button" type="submit" disabled={saving || !form.agentId || !form.name.trim() || !form.deploymentSlug.trim()}>
              {saving ? t(editingId ? "deployments.updating" : "deployments.creating") : t(editingId ? "deployments.updateAction" : "deployments.saveDraftAction")}
            </button>
          </div>
        </form>

        <section className="knowledge-list">
          <div className="section-heading">
            <div>
              <span className="eyebrow blue">{t("deployments.inventory")}</span>
              <h2>{t("deployments.listTitle")}</h2>
              <p className="section-description">{t("deployments.listDescription")}</p>
            </div>
            <span className="count-badge">{t(deployments.length === 1 ? "deployments.count.one" : "deployments.count.other", { count: deployments.length })}</span>
          </div>
          {deployments.length ? (
            <div className="knowledge-items">
              {deployments.map((deployment) => {
                const expanded = expandedId === deployment.id;
                return (
                  <article className={`knowledge-item deployment-inventory-item ${expanded ? "expanded" : "collapsed"}`} key={deployment.id}>
                    <div className="agent-inventory-header">
                      <button
                        className="agent-toggle"
                        type="button"
                        data-tour="deployment-list-toggle"
                        onClick={() => toggleExpanded(deployment.id)}
                        aria-expanded={expanded}
                        aria-controls={`deployment-panel-${deployment.id}`}
                      >
                        <span className="agent-toggle-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24"><path d="m8 10 4 4 4-4" /></svg>
                        </span>
                        <span className="agent-toggle-copy">
                          <span className="agent-lifecycle-badge indexed">{t(`deployments.channel.${deployment.channelType.toLowerCase()}`)}</span>
                          <strong>{deployment.name}</strong>
                          <small>{deployment.agentName || t("deployments.agentMissing")}</small>
                        </span>
                      </button>
                      <div className="agent-collapsed-meta">
                        <span className={`status-badge ${deployment.status === "ACTIVE" ? "stored" : "inactive"}`} data-tour="deployment-status-badge">
                          {t(`deployments.status.${deployment.status.toLowerCase()}`)}
                        </span>
                        {deployment.channelType === "WEB_CHAT" ? (
                          <Link className="small-action" href={`/deployments/${deployment.id}/appearance`}>
                            {t("deployments.appearanceAction")}
                          </Link>
                        ) : null}
                      </div>
                    </div>

                    {expanded ? (
                      <div className="agent-expanded-panel" id={`deployment-panel-${deployment.id}`}>
                        <div>
                          <small>{t("deployments.updatedAt", { date: formatDate(deployment.updatedAt, locale) })}</small>
                          <div className="deployment-endpoints">
                            <CopyRow
                              label={t("deployments.queryUrlLabel")}
                              value={deployment.queryUrl}
                              copyLabel={t("common.copy")}
                              copiedLabel={t("common.copied")}
                              copied={copiedKey === `${deployment.id}:query`}
                              onCopy={() => copyText(deployment.queryUrl, `${deployment.id}:query`)}
                            />
                            {deployment.embedSnippet ? (
                              <CopyRow
                                label={t("deployments.embedLabel")}
                                value={deployment.embedSnippet}
                                copyLabel={t("common.copy")}
                                copiedLabel={t("common.copied")}
                                copied={copiedKey === `${deployment.id}:embed`}
                                onCopy={() => copyText(deployment.embedSnippet ?? "", `${deployment.id}:embed`)}
                              />
                            ) : null}
                            <button
                              className="link-button"
                              type="button"
                              onClick={() => regeneratePublicId(deployment)}
                              disabled={regeneratingId === deployment.id}
                            >
                              {regeneratingId === deployment.id ? t("deployments.regenerating") : t("deployments.regeneratePublicId")}
                            </button>
                          </div>
                        </div>
                        <div className="knowledge-meta deployment-meta">
                          <strong>{deployment.deploymentSlug}</strong>
                          <span>{formatLimits(deployment, t)}</span>
                          <span>{(deployment.allowedOrigins?.length ?? 0)
                            ? t("deployments.allowedOriginsValue", { count: deployment.allowedOrigins.length })
                            : t("deployments.allowedOriginsNone")}</span>
                          <div className="item-actions">
                            {deployment.channelType === "WEB_CHAT" ? (
                              <button
                                className={`icon-button ${testChatTarget?.key === `deployment:${deployment.id}` ? "active" : ""}`}
                                type="button"
                                onClick={() => openTestChat({ key: `deployment:${deployment.id}`, publicId: deployment.publicId })}
                                disabled={testChatLoading}
                                aria-label={t("deployments.testChatCardAction", { name: deployment.name })}
                                title={t("deployments.testChatCardAction", { name: deployment.name })}
                              >
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                              </button>
                            ) : null}
                            <button className="icon-button" type="button" onClick={() => edit(deployment)} aria-label={t("deployments.edit", { name: deployment.name })} title={t("deployments.edit", { name: deployment.name })}>
                              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                            </button>
                            <button
                              className={`icon-button ${deployment.status === "ACTIVE" ? "" : "publish"}`}
                              type="button"
                              onClick={() => togglePublish(deployment)}
                              disabled={togglingId === deployment.id}
                              aria-label={t(deployment.status === "ACTIVE" ? "deployments.unpublishSwitchLabel" : "deployments.publishSwitchLabel", { name: deployment.name })}
                              title={t(deployment.status === "ACTIVE" ? "deployments.unpublishSwitchLabel" : "deployments.publishSwitchLabel", { name: deployment.name })}
                            >
                              {deployment.status === "ACTIVE" ? (
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></svg>
                              ) : (
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></svg>
                              )}
                            </button>
                            <button className="icon-button danger" type="button" onClick={() => setDeploymentToDelete(deployment)} disabled={deletingId === deployment.id} aria-label={t("deployments.delete", { name: deployment.name })} title={t("deployments.delete", { name: deployment.name })}>
                              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state compact"><span aria-hidden="true">0</span><strong>{t("deployments.emptyTitle")}</strong><p>{t("deployments.emptyDescription")}</p></div>
          )}
        </section>
      </section>
      {deploymentToDelete ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deletingId) setDeploymentToDelete(null); }}>
          <section className="confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-deployment-title" aria-describedby="delete-deployment-description">
            <span className="confirmation-icon" aria-hidden="true">!</span>
            <h2 id="delete-deployment-title">{t("deployments.deleteDialog.title")}</h2>
            <p id="delete-deployment-description">{t("deployments.deleteDialog.description", { name: deploymentToDelete.name })}</p>
            <div className="confirmation-actions">
              <button className="secondary-button" type="button" onClick={() => setDeploymentToDelete(null)} disabled={deletingId === deploymentToDelete.id}>{t("common.cancel")}</button>
              <button className="danger-button" type="button" onClick={remove} disabled={deletingId === deploymentToDelete.id}>{deletingId === deploymentToDelete.id ? t("deployments.deleting") : t("deployments.deleteAction")}</button>
            </div>
          </section>
        </div>
      ) : null}
      {publishWithoutOrigins ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && togglingId !== publishWithoutOrigins.id) setPublishWithoutOrigins(null); }}>
          <section className="confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="publish-no-origins-title" aria-describedby="publish-no-origins-description">
            <span className="confirmation-icon" aria-hidden="true">!</span>
            <h2 id="publish-no-origins-title">{t("deployments.publishNoOriginsDialog.title")}</h2>
            <p id="publish-no-origins-description">{t("deployments.publishNoOriginsDialog.description", { name: publishWithoutOrigins.name })}</p>
            <div className="confirmation-actions">
              <button className="secondary-button" type="button" onClick={() => setPublishWithoutOrigins(null)} disabled={togglingId === publishWithoutOrigins.id}>{t("common.cancel")}</button>
              <button
                className="danger-button"
                type="button"
                onClick={async () => {
                  const target = publishWithoutOrigins;
                  setPublishWithoutOrigins(null);
                  if (target) await applyStatus(target, "ACTIVE");
                }}
                disabled={togglingId === publishWithoutOrigins.id}
              >
                {t("deployments.publishNoOriginsDialog.confirm")}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      <GuidedTour open={formTour.open} steps={DEPLOYMENT_FORM_TOUR_STEPS} onClose={formTour.close} />
      {/* Caja invisible: solo existe para acotar dónde se posiciona y se
          recorta el widget real (position: fixed por diseño, para verse
          igual que en la web de un cliente). Sin fondo ni bordes propios --
          lo único visible es el widget mismo. Siempre montada (oculta con
          `hidden`, nunca desmontada) porque el ref tiene que existir en el
          DOM desde ANTES de inyectar cualquier script: un archivo local
          puede cargar y montar el widget más rápido de lo que React tarda
          en renderizar esta caja si la condicionamos a `testChatTarget`. */}
      <div className="test-chat-stage" ref={testChatStageRef} hidden={!testChatTarget} />
    </div>
  );
}

function messageOf(error: unknown, t: Translate): string {
  if (error instanceof AgentFactoryApiError) return t(error.code, error.variables);
  return t("common.unexpectedError");
}

function CopyRow({
  label,
  value,
  copyLabel,
  copiedLabel,
  copied,
  onCopy
}: {
  label: string;
  value: string;
  copyLabel: string;
  copiedLabel: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="copy-row">
      <span className="copy-row-label">{label}</span>
      <code className="copy-row-value">{value}</code>
      <button className="link-button" type="button" onClick={onCopy}>
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatLimits(deployment: AgentDeployment, t: Translate): string {
  const parts: string[] = [];
  if (deployment.rateLimitPerMinute != null) {
    parts.push(t("deployments.rateLimitMinuteValue", { count: deployment.rateLimitPerMinute }));
  }
  if (deployment.rateLimitPerDay != null) {
    parts.push(t("deployments.rateLimitDayValue", { count: deployment.rateLimitPerDay }));
  }
  return parts.length ? parts.join(" · ") : t("deployments.rateLimitNone");
}

function parseLimit(value: string): number | undefined {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseOrigins(value: string): string[] {
  const seen = new Set<string>();
  for (const line of value.split(/[\r\n,]+/)) {
    const origin = line.trim().toLowerCase().replace(/\/+$/, "");
    if (origin) seen.add(origin);
  }
  return [...seen].slice(0, 20);
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
