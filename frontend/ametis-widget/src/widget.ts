/**
 * AMETIS Agent Factory — widget de chat embebible.
 *
 * Se carga con una etiqueta <script> que trae dos atributos:
 *   data-deployment="<publicId>"   identificador opaco del despliegue
 *   data-endpoint="<baseUrl>"      base pública, ej. https://.../api/agent-factory/public
 *   data-locale="es|en"            opcional, por defecto "es"
 *
 * No depende de ninguna librería: todo el marcado y estilos viven dentro de un
 * Shadow DOM aislado para no chocar con el CSS del sitio anfitrión.
 */

type DeploymentInfo = {
  deploymentName: string;
  agentName: string;
  channelType: string;
  welcomeMessage: string | null;
};

type QueryResponse = {
  question: string;
  answer: string;
  responseType: string;
  suggestions: string[];
};

type Message = { role: "user" | "bot" | "error"; text: string };

type Strings = {
  headerFallback: string;
  placeholder: string;
  send: string;
  typing: string;
  errorGeneric: string;
  launcherLabel: string;
  closeLabel: string;
  poweredBy: string;
};

const STRINGS: Record<string, Strings> = {
  es: {
    headerFallback: "Asistente",
    placeholder: "Escribe tu pregunta…",
    send: "Enviar",
    typing: "Escribiendo…",
    errorGeneric: "No se pudo enviar tu mensaje. Inténtalo de nuevo.",
    launcherLabel: "Abrir chat",
    closeLabel: "Cerrar chat",
    poweredBy: "Con tecnología de AMETIS"
  },
  en: {
    headerFallback: "Assistant",
    placeholder: "Type your question…",
    send: "Send",
    typing: "Typing…",
    errorGeneric: "Could not send your message. Please try again.",
    launcherLabel: "Open chat",
    closeLabel: "Close chat",
    poweredBy: "Powered by AMETIS"
  }
};

const WIDGET_CSS = `
  :host { all: initial; }
  * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  .launcher {
    position: fixed; right: 20px; bottom: 20px; width: 58px; height: 58px; border-radius: 50%;
    background: #1558d6; color: #fff; border: none; cursor: pointer;
    display: grid; place-items: center; box-shadow: 0 10px 24px rgba(21,88,214,.35);
    z-index: 2147483000; transition: transform .15s ease;
  }
  .launcher:hover { transform: translateY(-2px); }
  .launcher svg { width: 26px; height: 26px; }
  .panel {
    position: fixed; right: 20px; bottom: 90px; width: 350px; max-width: calc(100vw - 32px);
    height: 480px; max-height: calc(100vh - 120px); background: #fff; border-radius: 16px;
    box-shadow: 0 20px 48px rgba(15,23,42,.22); display: flex; flex-direction: column; overflow: hidden;
    z-index: 2147483000; opacity: 0; pointer-events: none; transform: translateY(12px);
    transition: opacity .18s ease, transform .18s ease;
  }
  .panel.open { opacity: 1; pointer-events: auto; transform: translateY(0); }
  .header {
    background: #0f1b3d; color: #fff; padding: 14px 16px; display: flex; align-items: center;
    justify-content: space-between; flex-shrink: 0;
  }
  .header-title { font-size: 14px; font-weight: 700; line-height: 1.3; }
  .header-sub { font-size: 11px; color: #9fb2e0; margin-top: 2px; }
  .close-btn {
    background: transparent; border: none; color: #cdd8f5; cursor: pointer; font-size: 18px;
    line-height: 1; padding: 4px; border-radius: 6px;
  }
  .close-btn:hover { background: rgba(255,255,255,.12); }
  .messages { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; background: #f7f9fc; }
  .bubble { max-width: 82%; padding: 9px 12px; border-radius: 12px; font-size: 13px; line-height: 1.45; white-space: pre-wrap; }
  .bubble.bot { align-self: flex-start; background: #fff; color: #1a2233; box-shadow: 0 1px 2px rgba(15,23,42,.08); border-bottom-left-radius: 4px; }
  .bubble.user { align-self: flex-end; background: #1558d6; color: #fff; border-bottom-right-radius: 4px; }
  .bubble.error { align-self: flex-start; background: #fff0f2; color: #962f40; border: 1px solid #f1ccd2; }
  .typing { align-self: flex-start; font-size: 12px; color: #7a89a8; padding: 0 4px; }
  .composer { display: flex; gap: 8px; padding: 10px; border-top: 1px solid #e7ebf3; background: #fff; flex-shrink: 0; }
  .composer textarea {
    flex: 1; resize: none; border: 1px solid #dbe1ee; border-radius: 10px; padding: 9px 11px;
    font-size: 13px; line-height: 1.4; max-height: 72px; outline: none; color: #1a2233;
  }
  .composer textarea:focus { border-color: #1558d6; }
  .composer button {
    border: none; background: #1558d6; color: #fff; border-radius: 10px; padding: 0 14px;
    font-size: 13px; font-weight: 700; cursor: pointer; flex-shrink: 0;
  }
  .composer button:disabled { opacity: .5; cursor: default; }
  .footer-note { text-align: center; font-size: 10px; color: #a6b0c3; padding: 5px 0 8px; background: #fff; flex-shrink: 0; }
`;

function readConfig(script: HTMLOrSVGScriptElement | null): { publicId: string; endpoint: string; locale: string } | null {
  const el = script as HTMLScriptElement | null;
  if (!el) return null;
  const publicId = el.getAttribute("data-deployment");
  const endpoint = el.getAttribute("data-endpoint");
  if (!publicId || !endpoint) return null;
  const locale = el.getAttribute("data-locale") || "es";
  return { publicId, endpoint: endpoint.replace(/\/+$/, ""), locale: STRINGS[locale] ? locale : "es" };
}

function launcherIcon(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
  </svg>`;
}

class AmetisWidget {
  private readonly publicId: string;
  private readonly endpoint: string;
  private readonly strings: Strings;
  private shadow!: ShadowRoot;
  private panelEl!: HTMLDivElement;
  private messagesEl!: HTMLDivElement;
  private textareaEl!: HTMLTextAreaElement;
  private sendBtn!: HTMLButtonElement;
  private headerTitleEl!: HTMLDivElement;
  private headerSubEl!: HTMLDivElement;
  private open = false;
  private loaded = false;
  private sending = false;
  private info: DeploymentInfo | null = null;

  constructor(config: { publicId: string; endpoint: string; locale: string }) {
    this.publicId = config.publicId;
    this.endpoint = config.endpoint;
    this.strings = STRINGS[config.locale];
  }

  mount(): void {
    const host = document.createElement("div");
    host.style.all = "initial";
    document.body.appendChild(host);
    this.shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = WIDGET_CSS;
    this.shadow.appendChild(style);

    const launcher = document.createElement("button");
    launcher.className = "launcher";
    launcher.type = "button";
    launcher.setAttribute("aria-label", this.strings.launcherLabel);
    launcher.innerHTML = launcherIcon();
    launcher.addEventListener("click", () => this.toggle());
    this.shadow.appendChild(launcher);

    const panel = document.createElement("div");
    panel.className = "panel";
    panel.setAttribute("role", "dialog");
    panel.innerHTML = `
      <div class="header">
        <div>
          <div class="header-title" data-title></div>
          <div class="header-sub" data-sub></div>
        </div>
        <button class="close-btn" type="button" aria-label="${this.strings.closeLabel}">&#10005;</button>
      </div>
      <div class="messages" data-messages></div>
      <div class="composer">
        <textarea rows="1" placeholder="${this.strings.placeholder}" data-input></textarea>
        <button type="button" data-send>${this.strings.send}</button>
      </div>
      <div class="footer-note">${this.strings.poweredBy}</div>
    `;
    this.shadow.appendChild(panel);
    this.panelEl = panel;
    this.messagesEl = panel.querySelector("[data-messages]") as HTMLDivElement;
    this.textareaEl = panel.querySelector("[data-input]") as HTMLTextAreaElement;
    this.sendBtn = panel.querySelector("[data-send]") as HTMLButtonElement;
    this.headerTitleEl = panel.querySelector("[data-title]") as HTMLDivElement;
    this.headerSubEl = panel.querySelector("[data-sub]") as HTMLDivElement;
    this.headerTitleEl.textContent = this.strings.headerFallback;

    (panel.querySelector(".close-btn") as HTMLButtonElement).addEventListener("click", () => this.toggle(false));
    this.sendBtn.addEventListener("click", () => this.send());
    this.textareaEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        this.send();
      }
    });
  }

  private toggle(force?: boolean): void {
    this.open = force ?? !this.open;
    this.panelEl.classList.toggle("open", this.open);
    if (this.open && !this.loaded) {
      this.loadInfo();
    }
  }

  private async loadInfo(): Promise<void> {
    this.loaded = true;
    try {
      const response = await fetch(`${this.endpoint}/${this.publicId}`, { method: "GET" });
      if (!response.ok) throw new Error(String(response.status));
      this.info = (await response.json()) as DeploymentInfo;
      this.headerTitleEl.textContent = this.info.agentName || this.info.deploymentName || this.strings.headerFallback;
      this.headerSubEl.textContent = this.info.deploymentName || "";
      if (this.info.welcomeMessage) {
        this.appendMessage({ role: "bot", text: this.info.welcomeMessage });
      }
    } catch {
      this.appendMessage({ role: "error", text: this.strings.errorGeneric });
    }
  }

  private appendMessage(message: Message): void {
    const bubble = document.createElement("div");
    bubble.className = `bubble ${message.role}`;
    bubble.textContent = message.text;
    this.messagesEl.appendChild(bubble);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  private async send(): Promise<void> {
    const question = this.textareaEl.value.trim();
    if (!question || this.sending) return;
    this.sending = true;
    this.sendBtn.disabled = true;
    this.textareaEl.value = "";
    this.appendMessage({ role: "user", text: question });

    const typing = document.createElement("div");
    typing.className = "typing";
    typing.textContent = this.strings.typing;
    this.messagesEl.appendChild(typing);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;

    try {
      const response = await fetch(`${this.endpoint}/${this.publicId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      });
      typing.remove();
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as QueryResponse;
      this.appendMessage({ role: "bot", text: data.answer });
    } catch {
      typing.remove();
      this.appendMessage({ role: "error", text: this.strings.errorGeneric });
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
