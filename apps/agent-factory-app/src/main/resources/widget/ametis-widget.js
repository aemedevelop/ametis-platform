"use strict";(()=>{var o={es:{headerFallback:"Asistente",placeholder:"Escribe tu pregunta\u2026",send:"Enviar",typing:"Escribiendo\u2026",errorGeneric:"No se pudo enviar tu mensaje. Int\xE9ntalo de nuevo.",launcherLabel:"Abrir chat",closeLabel:"Cerrar chat",poweredBy:"Con tecnolog\xEDa de AMETIS"},en:{headerFallback:"Assistant",placeholder:"Type your question\u2026",send:"Send",typing:"Typing\u2026",errorGeneric:"Could not send your message. Please try again.",launcherLabel:"Open chat",closeLabel:"Close chat",poweredBy:"Powered by AMETIS"}},l=`
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
`;function d(i){let e=i;if(!e)return null;let t=e.getAttribute("data-deployment"),s=e.getAttribute("data-endpoint");if(!t||!s)return null;let n=e.getAttribute("data-locale")||"es";return{publicId:t,endpoint:s.replace(/\/+$/,""),locale:o[n]?n:"es"}}function p(){return`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
  </svg>`}var a=class{constructor(e){this.open=!1;this.loaded=!1;this.sending=!1;this.info=null;this.publicId=e.publicId,this.endpoint=e.endpoint,this.strings=o[e.locale]}mount(){let e=document.createElement("div");e.style.all="initial",document.body.appendChild(e),this.shadow=e.attachShadow({mode:"open"});let t=document.createElement("style");t.textContent=l,this.shadow.appendChild(t);let s=document.createElement("button");s.className="launcher",s.type="button",s.setAttribute("aria-label",this.strings.launcherLabel),s.innerHTML=p(),s.addEventListener("click",()=>this.toggle()),this.shadow.appendChild(s);let n=document.createElement("div");n.className="panel",n.setAttribute("role","dialog"),n.innerHTML=`
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
    `,this.shadow.appendChild(n),this.panelEl=n,this.messagesEl=n.querySelector("[data-messages]"),this.textareaEl=n.querySelector("[data-input]"),this.sendBtn=n.querySelector("[data-send]"),this.headerTitleEl=n.querySelector("[data-title]"),this.headerSubEl=n.querySelector("[data-sub]"),this.headerTitleEl.textContent=this.strings.headerFallback,n.querySelector(".close-btn").addEventListener("click",()=>this.toggle(!1)),this.sendBtn.addEventListener("click",()=>this.send()),this.textareaEl.addEventListener("keydown",r=>{r.key==="Enter"&&!r.shiftKey&&(r.preventDefault(),this.send())})}toggle(e){this.open=e!=null?e:!this.open,this.panelEl.classList.toggle("open",this.open),this.open&&!this.loaded&&this.loadInfo()}async loadInfo(){this.loaded=!0;try{let e=await fetch(`${this.endpoint}/${this.publicId}`,{method:"GET"});if(!e.ok)throw new Error(String(e.status));this.info=await e.json(),this.headerTitleEl.textContent=this.info.agentName||this.info.deploymentName||this.strings.headerFallback,this.headerSubEl.textContent=this.info.deploymentName||"",this.info.welcomeMessage&&this.appendMessage({role:"bot",text:this.info.welcomeMessage})}catch(e){this.appendMessage({role:"error",text:this.strings.errorGeneric})}}appendMessage(e){let t=document.createElement("div");t.className=`bubble ${e.role}`,t.textContent=e.text,this.messagesEl.appendChild(t),this.messagesEl.scrollTop=this.messagesEl.scrollHeight}async send(){let e=this.textareaEl.value.trim();if(!e||this.sending)return;this.sending=!0,this.sendBtn.disabled=!0,this.textareaEl.value="",this.appendMessage({role:"user",text:e});let t=document.createElement("div");t.className="typing",t.textContent=this.strings.typing,this.messagesEl.appendChild(t),this.messagesEl.scrollTop=this.messagesEl.scrollHeight;try{let s=await fetch(`${this.endpoint}/${this.publicId}/query`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:e})});if(t.remove(),!s.ok)throw new Error(String(s.status));let n=await s.json();this.appendMessage({role:"bot",text:n.answer})}catch(s){t.remove(),this.appendMessage({role:"error",text:this.strings.errorGeneric})}finally{this.sending=!1,this.sendBtn.disabled=!1}}};(function(){let e=d(document.currentScript);if(!e)return;let t=new a(e);document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>t.mount()):t.mount()})();})();
