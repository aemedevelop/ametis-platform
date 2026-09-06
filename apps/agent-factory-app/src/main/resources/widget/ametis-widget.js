"use strict";(()=>{var h={system:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',serif:'Georgia, "Times New Roman", Times, serif',mono:'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',humanist:'"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'},u={es:{headerFallback:"Asistente",subtitleFallback:"En l\xEDnea",placeholder:"Escribe tu pregunta...",typing:"Escribiendo\u2026",errorGeneric:"No se pudo conectar con el servidor. Prueba de nuevo en unos segundos.",launcherLabel:"Abrir chat",minimizeLabel:"Minimizar chat",closeLabel:"Cerrar chat",sendLabel:"Enviar pregunta"},en:{headerFallback:"Assistant",subtitleFallback:"Online",placeholder:"Type your question...",typing:"Typing\u2026",errorGeneric:"Couldn't reach the server. Please try again in a few seconds.",launcherLabel:"Open chat",minimizeLabel:"Minimize chat",closeLabel:"Close chat",sendLabel:"Send question"}},p="#1e3a8a",g="linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",b=`
  :host { all: initial; }
  * { box-sizing: border-box; font-family: var(--amw-font, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif); }

  .root { position: fixed; right: 1.25rem; bottom: 1.25rem; z-index: 2147483000; display: flex; flex-direction: column; align-items: flex-end; gap: 0.75rem; }
  .root.left { right: auto; left: 1.25rem; align-items: flex-start; }

  .bubble {
    display: inline-flex; align-items: center; justify-content: center; overflow: hidden;
    width: 3.5rem; height: 3.5rem; border: 0; border-radius: 9999px;
    background: var(--amw-grad, ${g}); color: #fff; box-shadow: 0 18px 35px rgba(30,58,138,.25);
    cursor: pointer; transition: transform 160ms ease, box-shadow 160ms ease;
  }
  .bubble:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 22px 40px rgba(30,58,138,.3); }
  .bubble svg { width: 24px; height: 24px; }
  .bubble img { width: 100%; height: 100%; object-fit: cover; }

  .window {
    width: min(92vw, 24rem); max-height: min(80vh, 40rem);
    display: flex; flex-direction: column; overflow: hidden;
    border-radius: 1rem; border: 1px solid rgba(15,23,42,.08); background: #fff;
    box-shadow: 0 20px 60px rgba(15,23,42,.18);
    opacity: 0; pointer-events: none; transform: translateY(12px);
    transition: opacity .18s ease, transform .18s ease;
  }
  .window.open { opacity: 1; pointer-events: auto; transform: translateY(0); }

  .header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .9rem 1rem; background: var(--amw-grad, ${g}); color: #fff; flex-shrink: 0; }
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
  .msg.user .bubble-text { background: var(--amw-primary, ${p}); color: #fff; border-color: transparent; }
  .msg.error .bubble-text { background: #fff0f2; color: #962f40; border-color: #f1ccd2; }

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
  .composer input:focus { border-color: var(--amw-primary, ${p}); box-shadow: 0 0 0 3px rgba(30,58,138,.12); }
  .send { display: inline-flex; align-items: center; justify-content: center; width: 2.5rem; height: 2.5rem; border: 0; border-radius: 9999px; background: var(--amw-primary, ${p}); color: #fff; cursor: pointer; flex-shrink: 0; }
  .send:disabled { opacity: .6; cursor: not-allowed; }
  .send svg { width: 16px; height: 16px; }

  @media (max-width: 640px) {
    .root, .root.left { right: .75rem; left: .75rem; bottom: .75rem; align-items: stretch; }
    .window { width: 100%; max-height: calc(100vh - 1.5rem); }
    .bubble { align-self: flex-end; }
    .root.left .bubble { align-self: flex-start; }
  }
`,d={message:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',send:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',minus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>',close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'};function f(o){let e=o;if(!e)return null;let n=e.getAttribute("data-preview")==="1",t=e.getAttribute("data-deployment")||"preview",i=e.getAttribute("data-endpoint")||"";if(!n&&(!t||!i))return null;let s=e.getAttribute("data-locale")||"es";return{publicId:t,endpoint:i.replace(/\/+$/,""),locale:u[s]?s:"es",preview:n}}function y(o,e){let n=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(o.trim());if(!n)return o;let t=n[1];t.length===3&&(t=t.split("").map(r=>r+r).join(""));let i=parseInt(t,16),s=r=>Math.round(r+(255-r)*e),a=s(i>>16&255),l=s(i>>8&255),c=s(i&255);return`#${(1<<24|a<<16|l<<8|c).toString(16).slice(1)}`}var m=class{constructor(e){this.open=!1;this.loaded=!1;this.sending=!1;this.publicId=e.publicId,this.endpoint=e.endpoint,this.strings=u[e.locale],this.preview=e.preview}mount(){let e=document.createElement("div");e.style.all="initial",document.body.appendChild(e),this.shadow=e.attachShadow({mode:"open"});let n=document.createElement("style");n.textContent=b,this.shadow.appendChild(n);let t=document.createElement("div");t.className="root",t.innerHTML=`
      <div class="window" role="dialog" aria-modal="false">
        <div class="header">
          <div class="brand">
            <span class="brand-icon" data-brand-icon>${d.message}</span>
            <span class="brand-text">
              <h3 data-title>${this.strings.headerFallback}</h3>
              <p data-subtitle>${this.strings.subtitleFallback}</p>
            </span>
          </div>
          <div class="actions">
            <button class="action" type="button" data-minimize aria-label="${this.strings.minimizeLabel}">${d.minus}</button>
            <button class="action" type="button" data-close aria-label="${this.strings.closeLabel}">${d.close}</button>
          </div>
        </div>
        <div class="messages" data-messages role="log" aria-live="polite"></div>
        <form class="composer" data-form>
          <input type="text" data-input placeholder="${this.strings.placeholder}" autocomplete="off" />
          <button class="send" type="submit" data-send aria-label="${this.strings.sendLabel}">${d.send}</button>
        </form>
      </div>
      <button class="bubble" type="button" data-launcher aria-label="${this.strings.launcherLabel}">${d.message}</button>
    `,this.shadow.appendChild(t),this.rootEl=t,this.windowEl=t.querySelector(".window"),this.messagesEl=t.querySelector("[data-messages]"),this.inputEl=t.querySelector("[data-input]"),this.sendBtn=t.querySelector("[data-send]"),this.titleEl=t.querySelector("[data-title]"),this.subtitleEl=t.querySelector("[data-subtitle]"),this.launcherEl=t.querySelector("[data-launcher]"),this.launcherEl.addEventListener("click",()=>this.toggle(!0)),t.querySelector("[data-minimize]").addEventListener("click",()=>this.toggle(!1)),t.querySelector("[data-close]").addEventListener("click",()=>this.toggle(!1)),t.querySelector("[data-form]").addEventListener("submit",i=>{i.preventDefault(),this.send()}),this.preview&&(window.addEventListener("message",i=>{let s=i.data;s&&s.type==="ametis-preview"&&s.payload&&this.renderPreview(s.payload)}),this.toggle(!0),window.parent.postMessage({type:"ametis-preview-ready"},"*"))}renderPreview(e){this.applyTheme(e.theme);let n=e.theme;this.titleEl.textContent=n&&n.title||e.agentName||this.strings.headerFallback,this.subtitleEl.textContent=n&&n.subtitle||e.deploymentName||this.strings.subtitleFallback,this.messagesEl.innerHTML="",e.welcomeMessage&&this.appendBubble("bot",e.welcomeMessage)}toggle(e){this.open=e!=null?e:!this.open,this.windowEl.classList.toggle("open",this.open),this.open&&!this.preview&&(this.inputEl.focus(),this.loaded||this.loadInfo())}applyTheme(e){let n=this.rootEl.style,t=e&&e.primaryColor&&/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(e.primaryColor)?e.primaryColor:null;t?(n.setProperty("--amw-primary",t),n.setProperty("--amw-grad",`linear-gradient(135deg, ${t} 0%, ${y(t,.22)} 100%)`)):(n.removeProperty("--amw-primary"),n.removeProperty("--amw-grad"));let i=e&&e.font?h[e.font]:null;i?n.setProperty("--amw-font",i):n.removeProperty("--amw-font"),this.rootEl.classList.toggle("left",(e&&e.position)==="bottom-left")}async loadInfo(){this.loaded=!0;try{let e=await fetch(`${this.endpoint}/${this.publicId}`,{method:"GET"});if(!e.ok)throw new Error(String(e.status));let n=await e.json();this.applyTheme(n.theme);let t=n.theme;this.titleEl.textContent=t&&t.title||n.agentName||n.deploymentName||this.strings.headerFallback,this.subtitleEl.textContent=t&&t.subtitle||n.deploymentName||this.strings.subtitleFallback,n.welcomeMessage&&this.appendBubble("bot",n.welcomeMessage)}catch(e){this.appendBubble("error",this.strings.errorGeneric)}}appendBubble(e,n,t){let i=document.createElement("div");i.className=`msg ${e}`;let s=document.createElement("div");s.className="msg-body";let a=document.createElement("div");if(a.className="bubble-text",a.textContent=n,s.appendChild(a),e==="bot"&&t&&t.length){let l=document.createElement("div");l.className="suggestions";for(let c of t){let r=document.createElement("button");r.className="suggestion",r.type="button",r.textContent=c,r.addEventListener("click",()=>this.send(c)),l.appendChild(r)}s.appendChild(l)}i.appendChild(s),this.messagesEl.appendChild(i),this.scrollToBottom()}scrollToBottom(){this.messagesEl.scrollTop=this.messagesEl.scrollHeight}async send(e){let n=(e!=null?e:this.inputEl.value).trim();if(!n||this.sending)return;this.sending=!0,this.sendBtn.disabled=!0,e||(this.inputEl.value=""),this.appendBubble("user",n);let t=document.createElement("div");t.className="msg bot",t.innerHTML='<div class="msg-body"><div class="bubble-text"><span class="dots"><span></span><span></span><span></span></span></div></div>',this.messagesEl.appendChild(t),this.scrollToBottom();try{let i=await fetch(`${this.endpoint}/${this.publicId}/query`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:n})});if(t.remove(),!i.ok)throw new Error(String(i.status));let s=await i.json();this.appendBubble("bot",s.answer||this.strings.errorGeneric,s.suggestions)}catch(i){t.remove(),this.appendBubble("error",this.strings.errorGeneric)}finally{this.sending=!1,this.sendBtn.disabled=!1}}};(function(){let e=f(document.currentScript);if(!e)return;let n=new m(e);document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>n.mount()):n.mount()})();})();
