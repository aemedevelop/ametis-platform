"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useT } from "@/components/IntlProviderClient";
import {
  AgentDeployment,
  AgentFactoryApiError,
  DeploymentBubbleAnimation,
  DeploymentFont,
  DeploymentPosition,
  deleteDeploymentAvatar,
  fetchDeployments,
  updateDeploymentAppearance,
  uploadDeploymentAvatar
} from "@/lib/agent-factory-api";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

const DEFAULT_COLOR = "#1e3a8a";
const PALETTE = ["#1e3a8a", "#0369a1", "#0f766e", "#4d7c0f", "#b45309", "#be123c", "#7c3aed", "#334155"];
const FONTS: DeploymentFont[] = ["system", "humanist", "serif", "mono"];
const POSITIONS: DeploymentPosition[] = ["bottom-right", "bottom-left"];
const BUBBLE_ANIMATIONS: DeploymentBubbleAnimation[] = ["bounce", "float", "ring", "none"];

const WIDGET_SRC = `${process.env.NEXT_PUBLIC_AGENT_FACTORY_API_BASE_URL ?? "http://localhost:8440"}/api/agent-factory/public/widget.js`;

// Maqueta puramente visual: no apunta a un despliegue real. El origen/las
// demás validaciones del canal no lo permitirían sin réplicas de config solo
// para esto, así que el tema se previsualiza en caliente vía postMessage y
// las preguntas no se responden de verdad (comportamiento esperado).
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
  const [bubbleAnimation, setBubbleAnimation] = useState<DeploymentBubbleAnimation | "">("");
  const [avatarUploading, setAvatarUploading] = useState(false);

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
        setBubbleAnimation((found.theme.bubbleAnimation ?? "") as DeploymentBubbleAnimation | "");
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
      subtitle: subtitle.trim() || null,
      avatarUrl: deployment?.theme?.avatarUrl ?? null,
      bubbleAnimation: bubbleAnimation || null
    },
    welcomeMessage: deployment?.welcomeMessage ?? "Hola 👋 ¿En qué puedo ayudarte?",
    agentName: deployment?.agentName ?? "Asistente",
    deploymentName: deployment?.name ?? ""
  }), [color, font, position, title, subtitle, bubbleAnimation, deployment]);

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
        subtitle: subtitle.trim() || undefined,
        bubbleAnimation: bubbleAnimation || undefined
      });
      setDeployment(updated);
      setSavedAt(Date.now());
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarPicked(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setAvatarUploading(true);
    setError(null);
    try {
      const updated = await uploadDeploymentAvatar(id, file);
      setDeployment(updated);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setAvatarUploading(false);
    }
  }

  async function removeAvatar() {
    setAvatarUploading(true);
    setError(null);
    try {
      const updated = await deleteDeploymentAvatar(id);
      setDeployment(updated);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setAvatarUploading(false);
    }
  }

  function reset() {
    setColor("");
    setFont("");
    setPosition("");
    setTitle("");
    setSubtitle("");
    setBubbleAnimation("");
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
            <span className="field-label">{t("appearance.avatarLabel")}</span>
            <small className="field-hint">{t("appearance.avatarHint")}</small>
            <div className="avatar-picker">
              {deployment.theme?.avatarUrl ? (
                <img className="avatar-preview" src={deployment.theme.avatarUrl} alt="" />
              ) : (
                <span className="avatar-preview empty" aria-hidden="true">{deployment.agentName.charAt(0).toUpperCase()}</span>
              )}
              <div className="avatar-picker-actions">
                <label className="small-action" htmlFor="avatar-file">
                  {avatarUploading ? t("appearance.avatarUploading") : t("appearance.avatarUpload")}
                </label>
                <input
                  id="avatar-file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  hidden
                  onChange={onAvatarPicked}
                  disabled={avatarUploading}
                />
                {deployment.theme?.avatarUrl ? (
                  <button type="button" className="link-button" onClick={removeAvatar} disabled={avatarUploading}>
                    {t("appearance.avatarRemove")}
                  </button>
                ) : null}
              </div>
            </div>
          </div>

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

          <div className="form-field">
            <span className="field-label">{t("appearance.bubbleAnimationLabel")}</span>
            <small className="field-hint">{t("appearance.bubbleAnimationHint")}</small>
            <div className="bubble-anim-options">
              {BUBBLE_ANIMATIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`bubble-anim-option ${(bubbleAnimation || "bounce") === option ? "selected" : ""}`}
                  onClick={() => setBubbleAnimation(option)}
                >
                  <span className={`bubble-anim-demo anim-${option}`} aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                  </span>
                  <span>{t(`appearance.bubbleAnimation.${option}`)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button className="secondary-button" type="button" onClick={reset} disabled={saving}>{t("appearance.reset")}</button>
            <button className="primary-button" type="button" onClick={save} disabled={saving}>
              {saving ? t("appearance.saving") : t("appearance.save")}
            </button>
          </div>
          <Link className="small-action appearance-bottom-back" href="/deployments">{t("appearance.back")}</Link>
        </div>

        <div className="appearance-preview">
          <div className="preview-toolbar">
            <span className="field-label">{t("appearance.previewLabel")}</span>
            <div className="preview-devices">
              <button type="button" className={device === "desktop" ? "active" : ""} onClick={() => setDevice("desktop")}>{t("appearance.previewDesktop")}</button>
              <button type="button" className={device === "mobile" ? "active" : ""} onClick={() => setDevice("mobile")}>{t("appearance.previewMobile")}</button>
            </div>
          </div>
          <div className="alert warning compact" role="status">
            <span aria-hidden="true">⚠️</span>
            <span>{t("appearance.previewDisclaimer")}</span>
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
