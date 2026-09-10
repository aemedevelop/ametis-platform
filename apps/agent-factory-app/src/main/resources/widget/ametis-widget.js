"use strict";(()=>{var b={system:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',serif:'Georgia, "Times New Roman", Times, serif',mono:'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',humanist:'"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'},h={es:{headerFallback:"Asistente",subtitleFallback:"En l\xEDnea",placeholder:"Escribe tu pregunta...",typing:"Escribiendo\u2026",errorGeneric:"No se pudo conectar con el servidor. Prueba de nuevo en unos segundos.",launcherLabel:"Abrir chat",minimizeLabel:"Minimizar chat",closeLabel:"Cerrar chat",sendLabel:"Enviar pregunta"},en:{headerFallback:"Assistant",subtitleFallback:"Online",placeholder:"Type your question...",typing:"Typing\u2026",errorGeneric:"Couldn't reach the server. Please try again in a few seconds.",launcherLabel:"Open chat",minimizeLabel:"Minimize chat",closeLabel:"Close chat",sendLabel:"Send question"}},p="#1e3a8a",u="linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",f=`
  :host { all: initial; }
  * { box-sizing: border-box; font-family: var(--amw-font, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif); }

  .root { position: fixed; right: 1.25rem; bottom: 1.25rem; z-index: 2147483000; display: flex; flex-direction: column; align-items: flex-end; gap: 0.75rem; }
  .root.left { right: auto; left: 1.25rem; align-items: flex-start; }

  .bubble {
    display: inline-flex; align-items: center; justify-content: center; overflow: hidden;
    width: 3.5rem; height: 3.5rem; border: 0; border-radius: 9999px;
    background: var(--amw-grad, ${u}); color: #fff; box-shadow: 0 18px 35px rgba(30,58,138,.25);
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
`,c={message:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',send:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',minus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>',close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'};function v(d){let e=d;if(!e)return null;let n=e.getAttribute("data-preview")==="1",t=e.getAttribute("data-deployment")||"preview",s=e.getAttribute("data-endpoint")||"";if(!n&&(!t||!s))return null;let i=e.getAttribute("data-locale")||"es";return{publicId:t,endpoint:s.replace(/\/+$/,""),locale:h[i]?i:"es",preview:n}}function y(d,e){let n=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(d.trim());if(!n)return d;let t=n[1];t.length===3&&(t=t.split("").map(a=>a+a).join(""));let s=parseInt(t,16),i=a=>Math.round(a+(255-a)*e),r=i(s>>16&255),o=i(s>>8&255),l=i(s&255);return`#${(1<<24|r<<16|o<<8|l).toString(16).slice(1)}`}var g=class{constructor(e){this.open=!1;this.loaded=!1;this.sending=!1;this.suggestedQuestions=[];this.suggestionCount=3;this.suggestionOrder="random";this.publicId=e.publicId,this.endpoint=e.endpoint,this.strings=h[e.locale],this.preview=e.preview}mount(){let e=document.createElement("div");e.style.all="initial",document.body.appendChild(e),this.shadow=e.attachShadow({mode:"open"});let n=document.createElement("style");n.textContent=f,this.shadow.appendChild(n);let t=document.createElement("div");t.className="root",t.innerHTML=`
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
      <button class="bubble" type="button" data-launcher aria-label="${this.strings.launcherLabel}">${c.message}</button>
    `,this.shadow.appendChild(t),this.rootEl=t,this.windowEl=t.querySelector(".window"),this.messagesEl=t.querySelector("[data-messages]"),this.inputEl=t.querySelector("[data-input]"),this.sendBtn=t.querySelector("[data-send]"),this.titleEl=t.querySelector("[data-title]"),this.subtitleEl=t.querySelector("[data-subtitle]"),this.launcherEl=t.querySelector("[data-launcher]"),this.launcherEl.addEventListener("click",()=>this.toggle(!0)),t.querySelector("[data-minimize]").addEventListener("click",()=>this.toggle(!1)),t.querySelector("[data-close]").addEventListener("click",()=>this.toggle(!1)),t.querySelector("[data-form]").addEventListener("submit",s=>{s.preventDefault(),this.send()}),this.preview?(window.addEventListener("message",s=>{let i=s.data;i&&i.type==="ametis-preview"&&i.payload&&this.renderPreview(i.payload)}),this.toggle(!0),window.parent.postMessage({type:"ametis-preview-ready"},"*")):this.loadInfo()}renderPreview(e){this.applyTheme(e.theme);let n=e.theme;this.titleEl.textContent=n&&n.title||e.agentName||this.strings.headerFallback,this.subtitleEl.textContent=n&&n.subtitle||e.deploymentName||this.strings.subtitleFallback,this.messagesEl.innerHTML="",e.welcomeMessage&&this.appendBubble("bot",e.welcomeMessage)}toggle(e){this.open=e!=null?e:!this.open,this.windowEl.classList.toggle("open",this.open),this.open&&!this.preview&&(this.inputEl.focus(),this.loaded||this.loadInfo())}applyTheme(e){let n=this.rootEl.style,t=e&&e.primaryColor&&/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(e.primaryColor)?e.primaryColor:null;t?(n.setProperty("--amw-primary",t),n.setProperty("--amw-grad",`linear-gradient(135deg, ${t} 0%, ${y(t,.22)} 100%)`)):(n.removeProperty("--amw-primary"),n.removeProperty("--amw-grad"));let s=e&&e.font?b[e.font]:null;s?n.setProperty("--amw-font",s):n.removeProperty("--amw-font"),this.rootEl.classList.toggle("left",(e&&e.position)==="bottom-left")}async loadInfo(){try{let e=await fetch(`${this.endpoint}/${this.publicId}`,{method:"GET"});if(!e.ok)throw new Error(String(e.status));let n=await e.json();this.loaded=!0,this.applyTheme(n.theme);let t=n.theme;if(this.titleEl.textContent=t&&t.title||n.agentName||n.deploymentName||this.strings.headerFallback,this.subtitleEl.textContent=t&&t.subtitle||n.deploymentName||this.strings.subtitleFallback,this.suggestedQuestions=Array.isArray(n.suggestedQuestions)?n.suggestedQuestions.filter(Boolean):[],this.suggestionCount=Math.max(1,Math.floor(n.suggestedQuestionsCount||3)),this.suggestionOrder=n.suggestedQuestionsOrder==="fixed"?"fixed":"random",!this.messagesEl.childElementCount){let s=this.pickSuggestions();n.welcomeMessage?this.appendBubble("bot",n.welcomeMessage,s):s.length&&this.appendSuggestions(s)}}catch(e){this.open&&this.appendBubble("error",this.strings.errorGeneric)}}appendBubble(e,n,t){let s=document.createElement("div");s.className=`msg ${e}`;let i=document.createElement("div");i.className="msg-body";let r=document.createElement("div");if(r.className="bubble-text",e==="bot"?this.renderRichText(r,n):r.textContent=n,i.appendChild(r),e==="bot"&&t&&t.length){let o=document.createElement("div");o.className="suggestions";for(let l of t){let a=document.createElement("button");a.className="suggestion",a.type="button",a.textContent=l,a.addEventListener("click",()=>this.send(l)),o.appendChild(a)}i.appendChild(o)}s.appendChild(i),this.messagesEl.appendChild(s),this.scrollToBottom()}pickSuggestions(e){let n=(e||"").trim().toLowerCase(),t=this.suggestedQuestions.filter(s=>s.trim().toLowerCase()!==n);if(t.length<=this.suggestionCount)return t;if(this.suggestionOrder==="fixed")return t.slice(0,this.suggestionCount);for(let s=t.length-1;s>0;s-=1){let i=Math.floor(Math.random()*(s+1));[t[s],t[i]]=[t[i],t[s]]}return t.slice(0,this.suggestionCount)}appendSuggestions(e){let n=document.createElement("div");n.className="msg bot";let t=document.createElement("div");t.className="msg-body";let s=document.createElement("div");s.className="suggestions";for(let i of e){let r=document.createElement("button");r.className="suggestion",r.type="button",r.textContent=i,r.addEventListener("click",()=>this.send(i)),s.appendChild(r)}t.appendChild(s),n.appendChild(t),this.messagesEl.appendChild(n),this.scrollToBottom()}scrollToBottom(){this.messagesEl.scrollTop=this.messagesEl.scrollHeight}cleanAnswer(e){return e.replace(/```([\s\S]*?)```/g,(n,t)=>t.trim()).replace(/`([^`]+)`/g,"$1").replace(/\[([^\]]+)\]\([^)]+\)/g,"$1").replace(/^\s{0,3}#{1,6}\s+/gm,"").replace(/\*\*([^*]+)\*\*/g,"$1").replace(/__([^_]+)__/g,"$1").replace(/(^|\s)\*(?!\s)([^*\n]+?)\*(?=\s|$|[.,;:])/g,"$1$2").replace(/[ \t]+\n/g,`
`).replace(/\n{3,}/g,`

`).trim()}renderRichText(e,n){let t=n.split(/\r?\n/),s=null,i=[],r=()=>{if(!i.length)return;let o=document.createElement("p");o.className="rt-p",o.textContent=i.join(" "),e.appendChild(o),i=[]};for(let o of t){let l=o.trim(),a=l.match(/^([-*•·]|\d+[.)])\s+(.*)$/);if(a){r(),s||(s=document.createElement("ul"),s.className="rt-list",e.appendChild(s));let m=document.createElement("li");m.textContent=a[2].trim(),s.appendChild(m);continue}s=null,l?i.push(l):r()}r(),e.childElementCount||(e.textContent=n)}parseOptions(e){let n=e.replace(/\s+$/,""),t=n.lastIndexOf(`
`),s=(t===-1?n:n.slice(t+1)).trim();if(s.includes("|")){let i=s.split("|").map(r=>r.trim().replace(/^[-•*]\s*/,"")).filter(Boolean);if(i.length>=2&&i.every(r=>r.length<=80))return{text:(t===-1?"":n.slice(0,t)).trim(),options:i}}return{text:e,options:[]}}async send(e){let n=(e!=null?e:this.inputEl.value).trim();if(!n||this.sending)return;this.sending=!0,this.sendBtn.disabled=!0,e||(this.inputEl.value=""),this.appendBubble("user",n);let t=document.createElement("div");t.className="msg bot",t.innerHTML='<div class="msg-body"><div class="bubble-text"><span class="dots"><span></span><span></span><span></span></span></div></div>',this.messagesEl.appendChild(t),this.scrollToBottom();try{let s=await fetch(`${this.endpoint}/${this.publicId}/query`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:n})});if(t.remove(),!s.ok)throw new Error(String(s.status));let i=await s.json(),r=this.cleanAnswer(i.answer||this.strings.errorGeneric),o=this.parseOptions(r);o.options.length?o.text?this.appendBubble("bot",o.text,o.options):this.appendSuggestions(o.options):this.appendBubble("bot",r,this.pickSuggestions(n))}catch(s){t.remove(),this.appendBubble("error",this.strings.errorGeneric)}finally{this.sending=!1,this.sendBtn.disabled=!1}}};(function(){let e=v(document.currentScript);if(!e)return;let n=new g(e);document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>n.mount()):n.mount()})();})();
