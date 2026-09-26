"use strict";(()=>{var h={system:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',serif:'Georgia, "Times New Roman", Times, serif',mono:'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',humanist:'"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'},b={es:{headerFallback:"Asistente",subtitleFallback:"En l\xEDnea",placeholder:"Escribe tu pregunta...",typing:"Escribiendo\u2026",errorGeneric:"No se pudo conectar con el servidor. Prueba de nuevo en unos segundos.",launcherLabel:"Abrir chat",minimizeLabel:"Minimizar chat",closeLabel:"Cerrar chat",sendLabel:"Enviar pregunta"},en:{headerFallback:"Assistant",subtitleFallback:"Online",placeholder:"Type your question...",typing:"Typing\u2026",errorGeneric:"Couldn't reach the server. Please try again in a few seconds.",launcherLabel:"Open chat",minimizeLabel:"Minimize chat",closeLabel:"Close chat",sendLabel:"Send question"}},p="#1e3a8a",u="linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",f=`
  :host { all: initial; }
  * { box-sizing: border-box; font-family: var(--amw-font, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif); }

  .root { position: fixed; right: 1.25rem; bottom: 1.25rem; z-index: 2147483000; display: flex; flex-direction: column; align-items: flex-end; gap: 0.75rem; }
  .root.left { right: auto; left: 1.25rem; align-items: flex-start; }

  .bubble {
    position: relative;
    display: inline-flex; align-items: center; justify-content: center; overflow: visible;
    width: 3.5rem; height: 3.5rem; border: 0; border-radius: 9999px;
    background: var(--amw-grad, ${u}); color: #fff; box-shadow: 0 18px 35px rgba(30,58,138,.25);
    cursor: pointer; transition: transform 160ms ease, box-shadow 160ms ease;
  }
  .bubble:hover { transform: translateY(-2px) scale(1.05); box-shadow: 0 22px 40px rgba(30,58,138,.3); }
  .bubble:active { transform: scale(.95); }
  .bubble svg { width: 24px; height: 24px; }
  .bubble img { width: 100%; height: 100%; border-radius: 9999px; object-fit: cover; }
  .bubble [data-bubble-icon] { display: inline-flex; align-items: center; justify-content: center; width: 100%; height: 100%; }

  /* Llamada a la atenci\xF3n: rebote de pelota (con "aplastado" al tocar el suelo) mientras el chat est\xE1 cerrado. */
  .bubble.attention { animation: amw-launcher-bounce 1.8s infinite; transform-origin: bottom center; }
  @keyframes amw-launcher-bounce {
    0%, 100% { transform: translateY(0) scale(1.18, .82); animation-timing-function: cubic-bezier(0,0,.2,1); }
    12% { transform: translateY(0) scale(1, 1); animation-timing-function: cubic-bezier(.8,0,1,1); }
    35% { transform: translateY(-15%) scale(.94, 1.06); animation-timing-function: cubic-bezier(0,0,.2,1); }
    50% { transform: translateY(-20%) scale(1, 1); animation-timing-function: cubic-bezier(.8,0,1,1); }
    65% { transform: translateY(-15%) scale(.94, 1.06); animation-timing-function: cubic-bezier(0,0,.2,1); }
    88% { transform: translateY(0) scale(1, 1); animation-timing-function: cubic-bezier(.8,0,1,1); }
  }
  .bubble-ping, .bubble-dot {
    position: absolute; top: -2px; right: -2px; width: .65rem; height: .65rem; border-radius: 9999px;
    background: var(--amw-primary, ${p});
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

  .header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .9rem 1rem; background: var(--amw-grad, ${u}); color: #fff; flex-shrink: 0; }
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
`,c={message:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',send:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',minus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>',close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'};function y(d){let e=d;if(!e)return null;let t=e.getAttribute("data-preview")==="1",n=e.getAttribute("data-deployment")||"preview",i=e.getAttribute("data-endpoint")||"";if(!t&&(!n||!i))return null;let s=e.getAttribute("data-locale")||"es";return{publicId:n,endpoint:i.replace(/\/+$/,""),locale:b[s]?s:"es",preview:t}}function v(d,e){let t=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(d.trim());if(!t)return d;let n=t[1];n.length===3&&(n=n.split("").map(o=>o+o).join(""));let i=parseInt(n,16),s=o=>Math.round(o+(255-o)*e),r=s(i>>16&255),a=s(i>>8&255),l=s(i&255);return`#${(1<<24|r<<16|a<<8|l).toString(16).slice(1)}`}var m=class{constructor(e){this.open=!1;this.loaded=!1;this.sending=!1;this.suggestedQuestions=[];this.suggestionCount=3;this.suggestionOrder="random";this.publicId=e.publicId,this.endpoint=e.endpoint,this.strings=b[e.locale],this.preview=e.preview}mount(){let e=document.createElement("div");e.style.all="initial",e.setAttribute("data-ametis-widget-host",this.publicId),document.body.appendChild(e),this.shadow=e.attachShadow({mode:"open"});let t=document.createElement("style");t.textContent=f,this.shadow.appendChild(t);let n=document.createElement("div");n.className="root",n.innerHTML=`
      <div class="window" role="dialog" aria-modal="false">
        <div class="header">
          <div class="brand">
            <span class="brand-icon" data-brand-icon>${c.message}</span>
            <span class="brand-text">
              <h3 data-title>${this.strings.headerFallback}</h3>
              <p data-subtitle>${this.strings.subtitleFallback}</p>
            </span>
          </div>
          <div class="actions">
            <button class="action" type="button" data-minimize aria-label="${this.strings.minimizeLabel}">${c.minus}</button>
            <button class="action" type="button" data-close aria-label="${this.strings.closeLabel}">${c.close}</button>
          </div>
        </div>
        <div class="messages" data-messages role="log" aria-live="polite"></div>
        <form class="composer" data-form>
          <input type="text" data-input placeholder="${this.strings.placeholder}" autocomplete="off" />
          <button class="send" type="submit" data-send aria-label="${this.strings.sendLabel}">${c.send}</button>
        </form>
      </div>
      <button class="bubble attention" type="button" data-launcher aria-label="${this.strings.launcherLabel}">
        <span data-bubble-icon>${c.message}</span>
        <span class="bubble-ping" data-launcher-badge aria-hidden="true"></span>
        <span class="bubble-dot" data-launcher-badge aria-hidden="true"></span>
      </button>
    `,this.shadow.appendChild(n),this.rootEl=n,this.windowEl=n.querySelector(".window"),this.messagesEl=n.querySelector("[data-messages]"),this.inputEl=n.querySelector("[data-input]"),this.sendBtn=n.querySelector("[data-send]"),this.titleEl=n.querySelector("[data-title]"),this.subtitleEl=n.querySelector("[data-subtitle]"),this.launcherEl=n.querySelector("[data-launcher]"),this.brandIconEl=n.querySelector("[data-brand-icon]"),this.launcherEl.addEventListener("click",()=>this.toggle(!0)),n.querySelector("[data-minimize]").addEventListener("click",()=>this.toggle(!1)),n.querySelector("[data-close]").addEventListener("click",()=>this.toggle(!1)),n.querySelector("[data-form]").addEventListener("submit",i=>{i.preventDefault(),this.send()}),this.preview?(window.addEventListener("message",i=>{let s=i.data;s&&s.type==="ametis-preview"&&s.payload&&this.renderPreview(s.payload)}),this.toggle(!0),window.parent.postMessage({type:"ametis-preview-ready"},"*")):this.loadInfo()}renderPreview(e){this.applyTheme(e.theme);let t=e.theme;this.titleEl.textContent=t&&t.title||e.agentName||this.strings.headerFallback,this.subtitleEl.textContent=t&&t.subtitle||e.deploymentName||this.strings.subtitleFallback,this.messagesEl.innerHTML="",e.welcomeMessage&&this.appendBubble("bot",e.welcomeMessage)}toggle(e){this.open=e!=null?e:!this.open,this.windowEl.classList.toggle("open",this.open),this.launcherEl.classList.toggle("attention",!this.open),this.launcherEl.querySelectorAll("[data-launcher-badge]").forEach(t=>{t.hidden=this.open}),this.open&&!this.preview&&(this.inputEl.focus(),this.loaded||this.loadInfo())}applyTheme(e){let t=this.rootEl.style,n=e&&e.primaryColor&&/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(e.primaryColor)?e.primaryColor:null;n?(t.setProperty("--amw-primary",n),t.setProperty("--amw-grad",`linear-gradient(135deg, ${n} 0%, ${v(n,.22)} 100%)`)):(t.removeProperty("--amw-primary"),t.removeProperty("--amw-grad"));let i=e&&e.font?h[e.font]:null;i?t.setProperty("--amw-font",i):t.removeProperty("--amw-font"),this.rootEl.classList.toggle("left",(e&&e.position)==="bottom-left"),this.applyAvatar(e&&e.avatarUrl?e.avatarUrl:null)}applyAvatar(e){this.brandIconEl.innerHTML=e?`<img src="${e}" alt="" />`:c.message}async loadInfo(){try{let e=await fetch(`${this.endpoint}/${this.publicId}`,{method:"GET"});if(!e.ok)throw new Error(String(e.status));let t=await e.json();this.loaded=!0,this.applyTheme(t.theme);let n=t.theme;if(this.titleEl.textContent=n&&n.title||t.agentName||t.deploymentName||this.strings.headerFallback,this.subtitleEl.textContent=n&&n.subtitle||t.deploymentName||this.strings.subtitleFallback,this.suggestedQuestions=Array.isArray(t.suggestedQuestions)?t.suggestedQuestions.filter(Boolean):[],this.suggestionCount=Math.max(1,Math.floor(t.suggestedQuestionsCount||3)),this.suggestionOrder=t.suggestedQuestionsOrder==="fixed"?"fixed":"random",!this.messagesEl.childElementCount){let i=this.pickFrom(this.suggestedQuestions);t.welcomeMessage?this.appendBubble("bot",t.welcomeMessage,i):i.length&&this.appendSuggestions(i)}}catch(e){this.open&&this.appendBubble("error",this.strings.errorGeneric)}}appendBubble(e,t,n){let i=document.createElement("div");i.className=`msg ${e}`;let s=document.createElement("div");s.className="msg-body";let r=document.createElement("div");if(r.className="bubble-text",e==="bot"?this.renderRichText(r,t):r.textContent=t,s.appendChild(r),e==="bot"&&n&&n.length){let a=document.createElement("div");a.className="suggestions";for(let l of n){let o=document.createElement("button");o.className="suggestion",o.type="button",o.textContent=l,o.addEventListener("click",()=>this.send(l)),a.appendChild(o)}s.appendChild(a)}i.appendChild(s),this.messagesEl.appendChild(i),this.scrollToBottom()}pickFrom(e,t){let n=(t||"").trim().toLowerCase(),i=(e||[]).filter(s=>s&&s.trim().toLowerCase()!==n);if(i.length<=this.suggestionCount)return i;if(this.suggestionOrder==="fixed")return i.slice(0,this.suggestionCount);for(let s=i.length-1;s>0;s-=1){let r=Math.floor(Math.random()*(s+1));[i[s],i[r]]=[i[r],i[s]]}return i.slice(0,this.suggestionCount)}appendSuggestions(e){let t=document.createElement("div");t.className="msg bot";let n=document.createElement("div");n.className="msg-body";let i=document.createElement("div");i.className="suggestions";for(let s of e){let r=document.createElement("button");r.className="suggestion",r.type="button",r.textContent=s,r.addEventListener("click",()=>this.send(s)),i.appendChild(r)}n.appendChild(i),t.appendChild(n),this.messagesEl.appendChild(t),this.scrollToBottom()}scrollToBottom(){this.messagesEl.scrollTop=this.messagesEl.scrollHeight}cleanAnswer(e){return e.replace(/```([\s\S]*?)```/g,(t,n)=>n.trim()).replace(/`([^`]+)`/g,"$1").replace(/\[([^\]]+)\]\([^)]+\)/g,"$1").replace(/^\s{0,3}#{1,6}\s+/gm,"").replace(/\*\*([^*]+)\*\*/g,"$1").replace(/__([^_]+)__/g,"$1").replace(/(^|\s)\*(?!\s)([^*\n]+?)\*(?=\s|$|[.,;:])/g,"$1$2").replace(/[ \t]+\n/g,`
`).replace(/\n{3,}/g,`

`).trim()}renderRichText(e,t){let n=t.split(/\r?\n/),i=null,s=[],r=()=>{if(!s.length)return;let a=document.createElement("p");a.className="rt-p",a.textContent=s.join(" "),e.appendChild(a),s=[]};for(let a of n){let l=a.trim(),o=l.match(/^([-*•·]|\d+[.)])\s+(.*)$/);if(o){r(),i||(i=document.createElement("ul"),i.className="rt-list",e.appendChild(i));let g=document.createElement("li");g.textContent=o[2].trim(),i.appendChild(g);continue}i=null,l?s.push(l):r()}r(),e.childElementCount||(e.textContent=t)}parseOptions(e){let t=e.replace(/\s+$/,""),n=t.lastIndexOf(`
`),i=(n===-1?t:t.slice(n+1)).trim();if(i.includes("|")){let s=i.split("|").map(r=>r.trim().replace(/^[-•*]\s*/,"")).filter(Boolean);if(s.length>=2&&s.every(r=>r.length<=80))return{text:(n===-1?"":t.slice(0,n)).trim(),options:s}}return{text:e,options:[]}}async send(e){let t=(e!=null?e:this.inputEl.value).trim();if(!t||this.sending)return;this.sending=!0,this.sendBtn.disabled=!0,e||(this.inputEl.value=""),this.appendBubble("user",t);let n=document.createElement("div");n.className="msg bot",n.innerHTML='<div class="msg-body"><div class="bubble-text"><span class="dots"><span></span><span></span><span></span></span></div></div>',this.messagesEl.appendChild(n),this.scrollToBottom();try{let i=await fetch(`${this.endpoint}/${this.publicId}/query`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:t})});if(n.remove(),!i.ok)throw new Error(String(i.status));let s=await i.json(),r=this.cleanAnswer(s.answer||this.strings.errorGeneric),a=this.parseOptions(r);if(a.options.length)a.text?this.appendBubble("bot",a.text,a.options):this.appendSuggestions(a.options);else{let l=Array.isArray(s.suggestions)&&s.suggestions.length?s.suggestions:this.suggestedQuestions;this.appendBubble("bot",r,this.pickFrom(l,t))}}catch(i){n.remove(),this.appendBubble("error",this.strings.errorGeneric)}finally{this.sending=!1,this.sendBtn.disabled=!1}}};(function(){let e=y(document.currentScript);if(!e)return;let t=new m(e);document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>t.mount()):t.mount()})();})();
