"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useT } from "@/components/IntlProviderClient";
import {
  AgentDeployment,
  AgentFactoryApiError,
  DeploymentFont,
  DeploymentPosition,
  fetchDeployments,
  updateDeploymentAppearance
} from "@/lib/agent-factory-api";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

const DEFAULT_COLOR = "#1e3a8a";
const PALETTE = ["#1e3a8a", "#0369a1", "#0f766e", "#4d7c0f", "#b45309", "#be123c", "#7c3aed", "#334155"];
const FONTS: DeploymentFont[] = ["system", "humanist", "serif", "mono"];
const POSITIONS: DeploymentPosition[] = ["bottom-right", "bottom-left"];

const WIDGET_SRC = `${process.env.NEXT_PUBLIC_AGENT_FACTORY_API_BASE_URL ?? "http://localhost:8440"}/api/agent-factory/public/widget.js`;

const IFRAME_DOC = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;height:100%;background:#eef2f8;font-family:system-ui,sans-serif}
  .hint{position:absolute;inset:0;display:grid;place-items:center;color:#94a3b8;font-size:13px}
</style></head><body>
  <div class="hint">Vista previa del widget</div>
  <script src="${WIDGET_SRC}" data-preview="1" data-locale="es" async></script>
</body></html>`;

export default function AppearancePage() {
  const t = useT();
  const params = useParams();
  const id = String(params.id);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [deployment, setDeployment] = useState<AgentDeployment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [error, setError] = useState<unknown>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const [color, setColor] = useState("");
  const [font, setFont] = useState<DeploymentFont | "">("");
  const [position, setPosition] = useState<DeploymentPosition | "">("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const found = (await fetchDeployments()).find((item) => item.id === id) ?? null;
      setDeployment(found);
      if (found?.theme) {
        setColor(found.theme.primaryColor ?? "");
        setFont((found.theme.font ?? "") as DeploymentFont | "");
        setPosition((found.theme.position ?? "") as DeploymentPosition | "");
        setTitle(found.theme.title ?? "");
        setSubtitle(found.theme.subtitle ?? "");
      }
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const previewPayload = useMemo(() => ({
    theme: {
      primaryColor: color || null,
      font: font || null,
      position: position || null,
      title: title.trim() || null,
      subtitle: subtitle.trim() || null
    },
    welcomeMessage: deployment?.welcomeMessage ?? "Hola 👋 ¿En qué puedo ayudarte?",
    agentName: deployment?.agentName ?? "Asistente",
    deploymentName: deployment?.name ?? ""
  }), [color, font, position, title, subtitle, deployment]);

  const postPreview = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: "ametis-preview", payload: previewPayload }, "*");
  }, [previewPayload]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if ((event.data as { type?: string })?.type === "ametis-preview-ready") postPreview();
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [postPreview]);

  useEffect(() => {
    const timeout = window.setTimeout(postPreview, 120);
    return () => window.clearTimeout(timeout);
  }, [postPreview]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateDeploymentAppearance(id, {
        primaryColor: color || undefined,
        font: font || undefined,
        position: position || undefined,
        title: title.trim() || undefined,
        subtitle: subtitle.trim() || undefined
      });
      setDeployment(updated);
      setSavedAt(Date.now());
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setColor("");
    setFont("");
    setPosition("");
    setTitle("");
    setSubtitle("");
  }

  if (loading) {
    return <section className="loading-card" role="status"><span className="spinner" aria-hidden="true" />{t("appearance.loading")}</section>;
  }

  if (!deployment || deployment.channelType !== "WEB_CHAT") {
    return (
      <div className="page-grid">
        <div className="alert error" role="alert"><span>{t("error.deploymentNotFound")}</span></div>
        <Link className="small-action" href="/deployments">{t("appearance.back")}</Link>
      </div>
    );
  }

  return (
    <div className="page-grid">
      <section className="intro-card">
        <div>
          <span className="eyebrow blue">{t("appearance.eyebrow")}</span>
          <h2>{t("appearance.title")} · {deployment.name}</h2>
          <p>{t("appearance.description")}</p>
        </div>
        <Link className="small-action" href="/deployments">{t("appearance.back")}</Link>
      </section>

      {error ? <div className="alert error" role="alert"><strong>{t("operation.failedTitle")}</strong><span>{messageOf(error, t)}</span></div> : null}
      {savedAt ? <div className="alert success" role="status"><span>{t("appearance.saved")}</span></div> : null}

      <section className="appearance-layout">
        <div className="appearance-controls">
          <div className="form-field">
            <span className="field-label">{t("appearance.colorLabel")}</span>
            <div className="swatch-row">
              {PALETTE.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  className={`swatch${(color || DEFAULT_COLOR).toLowerCase() === hex ? " selected" : ""}`}
                  style={{ background: hex }}
                  onClick={() => setColor(hex)}
                  aria-label={hex}
                />
              ))}
              <label className="swatch swatch-custom" title={t("appearance.colorCustom")}>
                <input type="color" value={color || DEFAULT_COLOR} onChange={(event) => setColor(event.target.value)} />
                <span aria-hidden="true">+</span>
              </label>
            </div>
          </div>

          <label className="form-field">
            <span className="field-label">{t("appearance.fontLabel")}</span>
            <select value={font} onChange={(event) => setFont(event.target.value as DeploymentFont | "")}>
              {FONTS.map((key) => <option key={key} value={key === "system" ? "" : key}>{t(`appearance.font.${key}`)}</option>)}
            </select>
          </label>

          <label className="form-field">
            <span className="field-label">{t("appearance.positionLabel")}</span>
            <select value={position} onChange={(event) => setPosition(event.target.value as DeploymentPosition | "")}>
              <option value="">{t("appearance.position.bottomRight")}</option>
              {POSITIONS.filter((p) => p !== "bottom-right").map((p) => (
                <option key={p} value={p}>{t("appearance.position.bottomLeft")}</option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span className="field-label">{t("appearance.titleLabel")}</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("appearance.titlePlaceholder")} maxLength={80} />
          </label>
          <label className="form-field">
            <span className="field-label">{t("appearance.subtitleLabel")}</span>
            <input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} placeholder={t("appearance.subtitlePlaceholder")} maxLength={160} />
          </label>

          <div className="form-actions">
            <button className="secondary-button" type="button" onClick={reset} disabled={saving}>{t("appearance.reset")}</button>
            <button className="primary-button" type="button" onClick={save} disabled={saving}>
              {saving ? t("appearance.saving") : t("appearance.save")}
            </button>
          </div>
        </div>

        <div className="appearance-preview">
          <div className="preview-toolbar">
            <span className="field-label">{t("appearance.previewLabel")}</span>
            <div className="preview-devices">
              <button type="button" className={device === "desktop" ? "active" : ""} onClick={() => setDevice("desktop")}>{t("appearance.previewDesktop")}</button>
              <button type="button" className={device === "mobile" ? "active" : ""} onClick={() => setDevice("mobile")}>{t("appearance.previewMobile")}</button>
            </div>
          </div>
          <div className={`preview-stage ${device}`}>
            <iframe ref={iframeRef} title={t("appearance.previewLabel")} srcDoc={IFRAME_DOC} />
          </div>
        </div>
      </section>
    </div>
  );
}

function messageOf(error: unknown, t: Translate): string {
  if (error instanceof AgentFactoryApiError) return t(error.code, error.variables);
  return t("common.unexpectedError");
}
