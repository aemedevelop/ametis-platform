/**
 * AMETIS Agent Factory — widget de chat embebible.
 *
 * Se carga con una etiqueta <script> que trae:
 *   data-deployment="<publicId>"   identificador opaco del despliegue
 *   data-endpoint="<baseUrl>"      base pública, ej. https://.../api/agent-factory/public
 *   data-locale="es|en"            opcional, por defecto "es"
 *
 * La apariencia (color, fuente, avatar, posición, textos de cabecera) la
 * configura AEME en el despliegue y llega en la respuesta de GET /{publicId}.
 * Diseño base alineado con el widget de la landing de AEME
 * (am-landing-react/src/components/AmetisChatWidget). Todo el marcado y los
 * estilos viven dentro de un Shadow DOM aislado.
 */

type BubbleAnimation = "none" | "bounce" | "float" | "ring";

type DeploymentTheme = {
  primaryColor: string | null;
  font: string | null;
  position: string | null;
  title: string | null;
  subtitle: string | null;
  avatarUrl: string | null;
  bubbleAnimation: BubbleAnimation | null;
};

const DEFAULT_BUBBLE_ANIMATION: BubbleAnimation = "bounce";
const BUBBLE_ANIMATIONS: BubbleAnimation[] = ["none", "bounce", "float", "ring"];

const FONT_STACKS: Record<string, string> = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", Times, serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  humanist: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
};

type DeploymentInfo = {
  deploymentName: string;
  agentName: string;
  channelType: string;
  welcomeMessage: string | null;
  suggestedQuestions: string[] | null;
  suggestedQuestionsCount: number | null;
  suggestedQuestionsOrder: string | null;
  theme: DeploymentTheme | null;
};

type QueryResponse = {
  question: string;
  answer: string;
  responseType: string;
  suggestions: string[];
};

type Strings = {
  headerFallback: string;
  subtitleFallback: string;
  placeholder: string;
  typing: string;
  errorGeneric: string;
  launcherLabel: string;
  minimizeLabel: string;
  closeLabel: string;
  sendLabel: string;
};

const STRINGS: Record<string, Strings> = {
  es: {
    headerFallback: "Asistente",
    subtitleFallback: "En línea",
    placeholder: "Escribe tu pregunta...",
    typing: "Escribiendo…",
    errorGeneric: "No se pudo conectar con el servidor. Prueba de nuevo en unos segundos.",
    launcherLabel: "Abrir chat",
    minimizeLabel: "Minimizar chat",
    closeLabel: "Cerrar chat",
    sendLabel: "Enviar pregunta"
  },
  en: {
    headerFallback: "Assistant",
    subtitleFallback: "Online",
    placeholder: "Type your question...",
    typing: "Typing…",
    errorGeneric: "Couldn't reach the server. Please try again in a few seconds.",
    launcherLabel: "Open chat",
    minimizeLabel: "Minimize chat",
    closeLabel: "Close chat",
    sendLabel: "Send question"
  }
};

const DEFAULT_PRIMARY = "#1e3a8a";
const DEFAULT_GRAD = "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)";

const WIDGET_CSS = `
  :host { all: initial; }
  * { box-sizing: border-box; font-family: var(--amw-font, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif); }

  .root { position: fixed; right: 1.25rem; bottom: 1.25rem; z-index: 2147483000; display: flex; flex-direction: column; align-items: flex-end; gap: 0.75rem; }
  .root.left { right: auto; left: 1.25rem; align-items: flex-start; }

  .bubble {
    position: relative;
    display: inline-flex; align-items: center; justify-content: center; overflow: visible;
    width: 3.5rem; height: 3.5rem; border: 0; border-radius: 9999px;
    background: var(--amw-grad, ${DEFAULT_GRAD}); color: #fff; box-shadow: 0 18px 35px rgba(30,58,138,.25);
    cursor: pointer; transition: transform 160ms ease, box-shadow 160ms ease;
  }
  .bubble:hover { transform: translateY(-2px) scale(1.05); box-shadow: 0 22px 40px rgba(30,58,138,.3); }
  .bubble:active { transform: scale(.95); }
  .bubble svg { width: 24px; height: 24px; }
  .bubble img { width: 100%; height: 100%; border-radius: 9999px; object-fit: cover; }
  .bubble [data-bubble-icon] { display: inline-flex; align-items: center; justify-content: center; width: 100%; height: 100%; }

  /* Llamadas a la atención de la burbuja cerrada -- una de cuatro, elegida
     en la pantalla de apariencia (theme.bubbleAnimation). "none" no anima. */
  .bubble.anim-bounce { animation: amw-launcher-bounce 1.8s infinite; transform-origin: bottom center; }
  @keyframes amw-launcher-bounce {
    0%, 100% { transform: translateY(0) scale(1.18, .82); animation-timing-function: cubic-bezier(0,0,.2,1); }
    12% { transform: translateY(0) scale(1, 1); animation-timing-function: cubic-bezier(.8,0,1,1); }
    35% { transform: translateY(-15%) scale(.94, 1.06); animation-timing-function: cubic-bezier(0,0,.2,1); }
    50% { transform: translateY(-20%) scale(1, 1); animation-timing-function: cubic-bezier(.8,0,1,1); }
    65% { transform: translateY(-15%) scale(.94, 1.06); animation-timing-function: cubic-bezier(0,0,.2,1); }
    88% { transform: translateY(0) scale(1, 1); animation-timing-function: cubic-bezier(.8,0,1,1); }
  }

  /* Sube y baja: flotación vertical suave, sin achatarse. */
  .bubble.anim-float { animation: amw-launcher-float 2.6s ease-in-out infinite; }
  @keyframes amw-launcher-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  /* Timbre periódico: quieta la mayor parte del ciclo, con un pequeño
     temblor de campana cada tanto. */
  .bubble.anim-ring { animation: amw-launcher-ring 2.4s ease-in-out infinite; transform-origin: top center; }
  @keyframes amw-launcher-ring {
    0%, 88%, 100% { transform: rotate(0deg); }
    90% { transform: rotate(-13deg); }
    92% { transform: rotate(10deg); }
    94% { transform: rotate(-7deg); }
    96% { transform: rotate(4deg); }
    98% { transform: rotate(-2deg); }
  }
  .bubble-ping, .bubble-dot {
    position: absolute; top: -2px; right: -2px; width: .65rem; height: .65rem; border-radius: 9999px;
    background: var(--amw-primary, ${DEFAULT_PRIMARY});
  }
  .bubble-dot { border: 2px solid #fff; }
  .bubble-ping { opacity: .75; animation: amw-ping 1.8s cubic-bezier(0,0,.2,1) infinite; }
  @keyframes amw-ping { 75%, 100% { transform: scale(2.2); opacity: 0; } }

  .window {
    width: min(92vw, 24rem); max-height: min(80vh, 40rem);
    display: flex; flex-direction: column; overflow: hidden;
    border-radius: 1rem; border: 1px solid rgba(15,23,42,.08); background: #fff;
    box-shadow: 0 20px 60px rgba(15,23,42,.18);
    opacity: 0; pointer-events: none; transform: translateY(12px);
    transition: opacity .18s ease, transform .18s ease;
  }
  .window.open { opacity: 1; pointer-events: auto; transform: translateY(0); }

  .header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .9rem 1rem; background: var(--amw-grad, ${DEFAULT_GRAD}); color: #fff; flex-shrink: 0; }
  .brand { display: flex; align-items: center; gap: .75rem; min-width: 0; }
  .brand-icon { display: inline-flex; align-items: center; justify-content: center; overflow: hidden; width: 2rem; height: 2rem; border-radius: 9999px; background: rgba(255,255,255,.16); flex-shrink: 0; }
  .brand-icon svg { width: 18px; height: 18px; }
  .brand-icon img { width: 100%; height: 100%; object-fit: cover; }
  .brand-text { min-width: 0; }
  .brand-text h3 { margin: 0; font-size: .95rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .brand-text p { margin: 0; font-size: .72rem; opacity: .84; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .actions { display: flex; gap: .35rem; flex-shrink: 0; }
  .action { display: inline-flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; border: 0; border-radius: 9999px; background: rgba(255,255,255,.16); color: #fff; cursor: pointer; }
  .action:hover { background: rgba(255,255,255,.28); }
  .action svg { width: 16px; height: 16px; }

  .messages { display: flex; flex-direction: column; gap: .7rem; padding: 1rem; min-height: 14rem; max-height: 24rem; overflow-y: auto; scroll-behavior: smooth; background: #f8fafc; }
  .msg { display: flex; }
  .msg.user { justify-content: flex-end; }
  .msg.bot, .msg.error { justify-content: flex-start; }
  .msg-body { max-width: 85%; }
  .bubble-text {
    padding: .7rem .85rem; border-radius: 1rem; font-size: .92rem; line-height: 1.45;
    white-space: pre-wrap; word-break: break-word;
    background: #fff; color: #111827; border: 1px solid rgba(15,23,42,.08); box-shadow: 0 8px 18px rgba(15,23,42,.05);
  }
  .msg.user .bubble-text { background: var(--amw-primary, ${DEFAULT_PRIMARY}); color: #fff; border-color: transparent; }
  .msg.error .bubble-text { background: #fff0f2; color: #962f40; border-color: #f1ccd2; }
  .bubble-text .rt-p { margin: 0; }
  .bubble-text .rt-p + .rt-p, .bubble-text .rt-p + .rt-list, .bubble-text .rt-list + .rt-p { margin-top: .5rem; }
  .bubble-text .rt-list { margin: 0; padding-left: 1.15rem; }
  .bubble-text .rt-list li { margin: .18rem 0; }

  .suggestions { display: flex; flex-direction: column; gap: .45rem; margin-top: .55rem; }
  .suggestion {
    display: block; width: 100%; padding: .7rem .85rem; border: 1px solid rgba(30,58,138,.18);
    border-radius: .9rem; background: #fff; color: #0f172a; text-align: left; font-size: .86rem;
    line-height: 1.4; cursor: pointer; box-shadow: 0 6px 14px rgba(15,23,42,.05);
  }
  .suggestion:hover { border-color: rgba(30,58,138,.42); background: #eff6ff; }

  .dots { display: inline-flex; align-items: center; gap: .2rem; }
  .dots span { display: inline-block; width: .35rem; height: .35rem; border-radius: 9999px; background: currentColor; opacity: .7; animation: amw-bounce 1s infinite ease-in-out; }
  .dots span:nth-child(2) { animation-delay: .15s; }
  .dots span:nth-child(3) { animation-delay: .3s; }
  @keyframes amw-bounce { 0%,80%,100% { transform: translateY(0); opacity: .45; } 40% { transform: translateY(-3px); opacity: 1; } }

  .composer { display: flex; align-items: center; gap: .5rem; padding: .8rem; border-top: 1px solid rgba(15,23,42,.08); background: #fff; flex-shrink: 0; }
  .composer input {
    flex: 1; min-width: 0; border: 1px solid rgba(15,23,42,.12); border-radius: 9999px;
    padding: .72rem .9rem; outline: none; font: inherit; color: #111827; background: #f8fafc;
  }
  .composer input:focus { border-color: var(--amw-primary, ${DEFAULT_PRIMARY}); box-shadow: 0 0 0 3px rgba(30,58,138,.12); }
  .send { display: inline-flex; align-items: center; justify-content: center; width: 2.5rem; height: 2.5rem; border: 0; border-radius: 9999px; background: var(--amw-primary, ${DEFAULT_PRIMARY}); color: #fff; cursor: pointer; flex-shrink: 0; }
  .send:disabled { opacity: .6; cursor: not-allowed; }
  .send svg { width: 16px; height: 16px; }

  @media (max-width: 640px) {
    .root, .root.left { right: .75rem; left: .75rem; bottom: .75rem; align-items: stretch; }
    .window { width: 100%; max-height: calc(100vh - 1.5rem); }
    .bubble { align-self: flex-end; }
    .root.left .bubble { align-self: flex-start; }
  }
`;

const ICONS = {
  message: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
  send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  minus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
};

type WidgetConfig = { publicId: string; endpoint: string; locale: string; preview: boolean };

function readConfig(script: HTMLOrSVGScriptElement | null): WidgetConfig | null {
  const el = script as HTMLScriptElement | null;
  if (!el) return null;
  const preview = el.getAttribute("data-preview") === "1";
  const publicId = el.getAttribute("data-deployment") || "preview";
  const endpoint = el.getAttribute("data-endpoint") || "";
  if (!preview && (!publicId || !endpoint)) return null;
  const locale = el.getAttribute("data-locale") || "es";
  return { publicId, endpoint: endpoint.replace(/\/+$/, ""), locale: STRINGS[locale] ? locale : "es", preview };
}

type PreviewPayload = {
  theme: DeploymentTheme | null;
  welcomeMessage: string | null;
  agentName: string;
  deploymentName: string;
};

/** Aclara un color hex hacia blanco para el extremo del gradiente. */
function lighten(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

class AmetisWidget {
  private readonly publicId: string;
  private readonly endpoint: string;
  private readonly strings: Strings;
  private readonly preview: boolean;
  private shadow!: ShadowRoot;
  private rootEl!: HTMLDivElement;
  private windowEl!: HTMLDivElement;
  private messagesEl!: HTMLDivElement;
  private inputEl!: HTMLInputElement;
  private sendBtn!: HTMLButtonElement;
  private titleEl!: HTMLElement;
  private subtitleEl!: HTMLElement;
  private launcherEl!: HTMLButtonElement;
  private brandIconEl!: HTMLElement;
  private open = false;
  private bubbleAnimation: BubbleAnimation = DEFAULT_BUBBLE_ANIMATION;
  private loaded = false;
  private sending = false;
  private suggestedQuestions: string[] = [];
  private suggestionCount = 3;
  private suggestionOrder: "random" | "fixed" = "random";

  constructor(config: WidgetConfig) {
    this.publicId = config.publicId;
    this.endpoint = config.endpoint;
    this.strings = STRINGS[config.locale];
    this.preview = config.preview;
  }

  mount(): void {
    const host = document.createElement("div");
    host.style.all = "initial";
    // Marca el host para que un embebedor externo (p. ej. el probador de chat
    // en vivo del panel de administración) pueda ubicarlo y retirarlo con
    // precisión, sin tener que adivinar cuál nodo recién agregado a <body> es
    // el suyo.
    host.setAttribute("data-ametis-widget-host", this.publicId);
    document.body.appendChild(host);
    this.shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = WIDGET_CSS;
    this.shadow.appendChild(style);

    const root = document.createElement("div");
    root.className = "root";
    root.innerHTML = `
      <div class="window" role="dialog" aria-modal="false">
        <div class="header">
          <div class="brand">
            <span class="brand-icon" data-brand-icon>${ICONS.message}</span>
            <span class="brand-text">
              <h3 data-title>${this.strings.headerFallback}</h3>
              <p data-subtitle>${this.strings.subtitleFallback}</p>
            </span>
          </div>
          <div class="actions">
            <button class="action" type="button" data-minimize aria-label="${this.strings.minimizeLabel}">${ICONS.minus}</button>
            <button class="action" type="button" data-close aria-label="${this.strings.closeLabel}">${ICONS.close}</button>
          </div>
        </div>
        <div class="messages" data-messages role="log" aria-live="polite"></div>
        <form class="composer" data-form>
          <input type="text" data-input placeholder="${this.strings.placeholder}" autocomplete="off" />
          <button class="send" type="submit" data-send aria-label="${this.strings.sendLabel}">${ICONS.send}</button>
        </form>
      </div>
      <button class="bubble" type="button" data-launcher aria-label="${this.strings.launcherLabel}">
        <span data-bubble-icon>${ICONS.message}</span>
        <span class="bubble-ping" data-launcher-badge aria-hidden="true"></span>
        <span class="bubble-dot" data-launcher-badge aria-hidden="true"></span>
      </button>
    `;
    this.shadow.appendChild(root);

    this.rootEl = root;
    this.windowEl = root.querySelector(".window") as HTMLDivElement;
    this.messagesEl = root.querySelector("[data-messages]") as HTMLDivElement;
    this.inputEl = root.querySelector("[data-input]") as HTMLInputElement;
    this.sendBtn = root.querySelector("[data-send]") as HTMLButtonElement;
    this.titleEl = root.querySelector("[data-title]") as HTMLElement;
    this.subtitleEl = root.querySelector("[data-subtitle]") as HTMLElement;
    this.launcherEl = root.querySelector("[data-launcher]") as HTMLButtonElement;
    this.brandIconEl = root.querySelector("[data-brand-icon]") as HTMLElement;

    this.launcherEl.addEventListener("click", () => this.toggle(true));
    (root.querySelector("[data-minimize]") as HTMLButtonElement).addEventListener("click", () => this.toggle(false));
    (root.querySelector("[data-close]") as HTMLButtonElement).addEventListener("click", () => this.toggle(false));
    (root.querySelector("[data-form]") as HTMLFormElement).addEventListener("submit", (event) => {
      event.preventDefault();
      this.send();
    });

    if (this.preview) {
      // Maqueta visual: edición en caliente del tema (color/fuente/logo) sin
      // guardar, vía postMessage desde la pantalla de apariencia. No consulta
      // ningún despliegue real.
      window.addEventListener("message", (event) => {
        const data = event.data as { type?: string; payload?: PreviewPayload };
        if (data && data.type === "ametis-preview" && data.payload) this.renderPreview(data.payload);
      });
      this.toggle(true);
      window.parent.postMessage({ type: "ametis-preview-ready" }, "*");
    } else {
      // Cargar la ficha del despliegue al montar, para que la burbuja ya salga
      // con el color/posición configurados sin esperar a que se abra el chat.
      this.loadInfo();
    }
  }

  private renderPreview(payload: PreviewPayload): void {
    this.applyTheme(payload.theme);
    const theme = payload.theme;
    this.titleEl.textContent = (theme && theme.title) || payload.agentName || this.strings.headerFallback;
    this.subtitleEl.textContent = (theme && theme.subtitle) || payload.deploymentName || this.strings.subtitleFallback;
    this.messagesEl.innerHTML = "";
    if (payload.welcomeMessage) this.appendBubble("bot", payload.welcomeMessage);
  }

  private toggle(force?: boolean): void {
    this.open = force ?? !this.open;
    this.windowEl.classList.toggle("open", this.open);
    // La animación de la burbuja y el punto de aviso solo tienen sentido con
    // el chat cerrado; reaparecen cada vez que se vuelve a cerrar.
    for (const animation of BUBBLE_ANIMATIONS) {
      this.launcherEl.classList.toggle(`anim-${animation}`, !this.open && this.bubbleAnimation === animation);
    }
    this.launcherEl.querySelectorAll("[data-launcher-badge]").forEach((el) => {
      (el as HTMLElement).hidden = this.open;
    });
    if (this.open && !this.preview) {
      this.inputEl.focus();
      if (!this.loaded) this.loadInfo();
    }
  }

  private applyTheme(theme: DeploymentTheme | null): void {
    const root = this.rootEl.style;
    const color = theme && theme.primaryColor && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(theme.primaryColor)
      ? theme.primaryColor : null;
    if (color) {
      root.setProperty("--amw-primary", color);
      root.setProperty("--amw-grad", `linear-gradient(135deg, ${color} 0%, ${lighten(color, 0.22)} 100%)`);
    } else {
      root.removeProperty("--amw-primary");
      root.removeProperty("--amw-grad");
    }
    const stack = theme && theme.font ? FONT_STACKS[theme.font] : null;
    if (stack) root.setProperty("--amw-font", stack);
    else root.removeProperty("--amw-font");

    this.rootEl.classList.toggle("left", (theme && theme.position) === "bottom-left");
    this.applyAvatar(theme && theme.avatarUrl ? theme.avatarUrl : null);

    this.bubbleAnimation = (theme && theme.bubbleAnimation) || DEFAULT_BUBBLE_ANIMATION;
    // El tema puede llegar (loadInfo) después del primer render de la
    // burbuja; reaplica las clases de animación con el valor ya resuelto.
    for (const animation of BUBBLE_ANIMATIONS) {
      this.launcherEl.classList.toggle(`anim-${animation}`, !this.open && this.bubbleAnimation === animation);
    }
  }

  /**
   * Sustituye el icono de la cabecera por el logo del negocio, si hay. La
   * burbuja flotante conserva siempre el icono de chat por defecto.
   */
  private applyAvatar(avatarUrl: string | null): void {
    this.brandIconEl.innerHTML = avatarUrl ? `<img src="${avatarUrl}" alt="" />` : ICONS.message;
  }

  private async loadInfo(): Promise<void> {
    try {
      const response = await fetch(`${this.endpoint}/${this.publicId}`, { method: "GET" });
      if (!response.ok) throw new Error(String(response.status));
      const info = (await response.json()) as DeploymentInfo;
      this.loaded = true;
      this.applyTheme(info.theme);
      const theme = info.theme;
      this.titleEl.textContent = (theme && theme.title) || info.agentName || info.deploymentName || this.strings.headerFallback;
      this.subtitleEl.textContent = (theme && theme.subtitle) || info.deploymentName || this.strings.subtitleFallback;
      this.suggestedQuestions = Array.isArray(info.suggestedQuestions) ? info.suggestedQuestions.filter(Boolean) : [];
      this.suggestionCount = Math.max(1, Math.floor(info.suggestedQuestionsCount || 3));
      this.suggestionOrder = info.suggestedQuestionsOrder === "fixed" ? "fixed" : "random";
      if (!this.messagesEl.childElementCount) {
        const chips = this.pickFrom(this.suggestedQuestions);
        if (info.welcomeMessage) {
          this.appendBubble("bot", info.welcomeMessage, chips);
        } else if (chips.length) {
          this.appendSuggestions(chips);
        }
      }
    } catch {
      // Sin conexión al montar: no molestamos con un error hasta que el usuario abra el chat.
      if (this.open) this.appendBubble("error", this.strings.errorGeneric);
    }
  }

  private appendBubble(role: "user" | "bot" | "error", text: string, suggestions?: string[]): void {
    const msg = document.createElement("div");
    msg.className = `msg ${role}`;
    const body = document.createElement("div");
    body.className = "msg-body";
    const bubble = document.createElement("div");
    bubble.className = "bubble-text";
    if (role === "bot") {
      this.renderRichText(bubble, text);
    } else {
      bubble.textContent = text;
    }
    body.appendChild(bubble);
    if (role === "bot" && suggestions && suggestions.length) {
      const wrap = document.createElement("div");
      wrap.className = "suggestions";
      for (const suggestion of suggestions) {
        const btn = document.createElement("button");
        btn.className = "suggestion";
        btn.type = "button";
        btn.textContent = suggestion;
        btn.addEventListener("click", () => this.send(suggestion));
        wrap.appendChild(btn);
      }
      body.appendChild(wrap);
    }
    msg.appendChild(body);
    this.messagesEl.appendChild(msg);
    this.scrollToBottom();
  }

  /** Subconjunto de chips a mostrar (según count/order), excluyendo `exclude`. */
  private pickFrom(source: string[], exclude?: string): string[] {
    const skip = (exclude || "").trim().toLowerCase();
    const pool = (source || []).filter((question) => question && question.trim().toLowerCase() !== skip);
    if (pool.length <= this.suggestionCount) return pool;
    if (this.suggestionOrder === "fixed") return pool.slice(0, this.suggestionCount);
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, this.suggestionCount);
  }

  /** Bloque de chips sin burbuja de texto (bienvenida sin mensaje). */
  private appendSuggestions(suggestions: string[]): void {
    const msg = document.createElement("div");
    msg.className = "msg bot";
    const body = document.createElement("div");
    body.className = "msg-body";
    const wrap = document.createElement("div");
    wrap.className = "suggestions";
    for (const suggestion of suggestions) {
      const btn = document.createElement("button");
      btn.className = "suggestion";
      btn.type = "button";
      btn.textContent = suggestion;
      btn.addEventListener("click", () => this.send(suggestion));
      wrap.appendChild(btn);
    }
    body.appendChild(wrap);
    msg.appendChild(body);
    this.messagesEl.appendChild(msg);
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  /** Quita el markdown que el widget no renderiza (negritas, `#`, enlaces, código). */
  private cleanAnswer(text: string): string {
    return text
      .replace(/```([\s\S]*?)```/g, (_, code: string) => code.trim())
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/^\s{0,3}#{1,6}\s+/gm, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/(^|\s)\*(?!\s)([^*\n]+?)\*(?=\s|$|[.,;:])/g, "$1$2")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  /**
   * Pinta el texto del bot con párrafos y listas de verdad: las líneas que
   * empiezan por viñeta (- * • ·) o "1." van en un <ul>; el resto son <p>.
   */
  private renderRichText(container: HTMLElement, text: string): void {
    const lines = text.split(/\r?\n/);
    let list: HTMLUListElement | null = null;
    let paragraph: string[] = [];

    const flushParagraph = () => {
      if (!paragraph.length) return;
      const p = document.createElement("p");
      p.className = "rt-p";
      p.textContent = paragraph.join(" ");
      container.appendChild(p);
      paragraph = [];
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      const bullet = line.match(/^([-*•·]|\d+[.)])\s+(.*)$/);
      if (bullet) {
        flushParagraph();
        if (!list) {
          list = document.createElement("ul");
          list.className = "rt-list";
          container.appendChild(list);
        }
        const li = document.createElement("li");
        li.textContent = bullet[2].trim();
        list.appendChild(li);
        continue;
      }
      list = null;
      if (!line) {
        flushParagraph();
      } else {
        paragraph.push(line);
      }
    }
    flushParagraph();

    if (!container.childElementCount) {
      container.textContent = text;
    }
  }

  /**
   * Si la respuesta termina con una línea de opciones separadas por pleca
   * ("A | B | C"), las devuelve como lista para pintarlas como botones.
   */
  private parseOptions(answer: string): { text: string; options: string[] } {
    const trimmed = answer.replace(/\s+$/, "");
    const nl = trimmed.lastIndexOf("\n");
    const lastLine = (nl === -1 ? trimmed : trimmed.slice(nl + 1)).trim();
    if (lastLine.includes("|")) {
      const options = lastLine
        .split("|")
        .map((part) => part.trim().replace(/^[-•*]\s*/, ""))
        .filter(Boolean);
      if (options.length >= 2 && options.every((option) => option.length <= 80)) {
        return { text: (nl === -1 ? "" : trimmed.slice(0, nl)).trim(), options };
      }
    }
    return { text: answer, options: [] };
  }

  private async send(override?: string): Promise<void> {
    const question = (override ?? this.inputEl.value).trim();
    if (!question || this.sending) return;
    this.sending = true;
    this.sendBtn.disabled = true;
    if (!override) this.inputEl.value = "";
    this.appendBubble("user", question);

    const loading = document.createElement("div");
    loading.className = "msg bot";
    loading.innerHTML = `<div class="msg-body"><div class="bubble-text"><span class="dots"><span></span><span></span><span></span></span></div></div>`;
    this.messagesEl.appendChild(loading);
    this.scrollToBottom();

    try {
      const response = await fetch(`${this.endpoint}/${this.publicId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      });
      loading.remove();
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as QueryResponse;
      const raw = this.cleanAnswer(data.answer || this.strings.errorGeneric);
      const parsed = this.parseOptions(raw);
      if (parsed.options.length) {
        if (parsed.text) {
          this.appendBubble("bot", parsed.text, parsed.options);
        } else {
          this.appendSuggestions(parsed.options);
        }
      } else {
        const pool = Array.isArray(data.suggestions) && data.suggestions.length
          ? data.suggestions
          : this.suggestedQuestions;
        this.appendBubble("bot", raw, this.pickFrom(pool, question));
      }
    } catch {
      loading.remove();
      this.appendBubble("error", this.strings.errorGeneric);
    } finally {
      this.sending = false;
      this.sendBtn.disabled = false;
    }
  }
}

(function init() {
  const config = readConfig(document.currentScript);
  if (!config) return;
  const widget = new AmetisWidget(config);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => widget.mount());
  } else {
    widget.mount();
  }
})();
