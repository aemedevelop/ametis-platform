"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { askCopilot, type ChatResponse } from "@/lib/api";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  responseType?: ChatResponse["response_type"];
  suggestions?: string[];
};

const defaultTenantId = process.env.NEXT_PUBLIC_CHAT_TENANT_ID ?? "aeme";

export function CopilotChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [tenantId, setTenantId] = useState(defaultTenantId);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hola. Soy el asistente de AEME. Puedo responder consultas usando la documentacion disponible.",
      responseType: "quick_reply"
    }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [isOpen, messages]);

  async function submitQuestion(nextQuestion: string) {
    const normalizedQuestion = nextQuestion.trim();
    const normalizedTenantId = tenantId.trim() || defaultTenantId;
    if (!normalizedQuestion || isSubmitting) return;

    setQuestion("");
    setIsSubmitting(true);
    setIsOpen(true);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: normalizedQuestion
    };

    setMessages((current) => [...current, userMessage]);

    try {
      const response = await askCopilot({
        tenant_id: normalizedTenantId,
        question: normalizedQuestion
      });

      setTenantId(response.tenant_id);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.answer || "No he recibido una respuesta con contenido.",
          responseType: response.response_type,
          suggestions: response.suggestions
        }
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "No se pudo conectar con el servidor. Prueba de nuevo en unos segundos.",
          responseType: "fallback"
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitQuestion(question);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {isOpen ? (
        <section className="flex h-[calc(100vh-7rem)] max-h-[42rem] min-h-[28rem] w-[calc(100vw-2rem)] max-w-[24rem] flex-col overflow-hidden rounded-2xl border border-cyanAccent/25 bg-[#071123]/95 shadow-[0_24px_70px_rgba(2,8,23,0.45)] backdrop-blur-xl">
          <header className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-[#08245f] via-[#0a3778] to-[#008f9a] px-4 py-3">
            <BrandLogo className="h-9 w-9 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">AEME Tech Assistant</p>
              <p className="truncate text-xs text-cyan-100">RAG documental y soporte inteligente</p>
            </div>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-xl leading-none text-white transition hover:bg-white/15"
              aria-label="Cerrar chat"
              onClick={() => setIsOpen(false)}
            >
              x
            </button>
          </header>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_35%),linear-gradient(180deg,rgba(8,17,33,0.98),rgba(8,17,33,0.94))] px-4 py-4">
            {messages.map((message) => (
              <article key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[86%] rounded-2xl rounded-br-md bg-[#0f6fff] px-4 py-3 text-sm text-white shadow-lg shadow-blue-950/20"
                      : "max-w-[86%] rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.07] px-4 py-3 text-sm text-slate-100"
                  }
                >
                  <p className="whitespace-pre-wrap leading-6">{message.content}</p>
                  {message.role === "assistant" && message.suggestions && message.suggestions.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {message.suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className="block w-full rounded-xl border border-cyanAccent/30 bg-cyanAccent/10 px-3 py-2 text-left text-xs font-semibold leading-5 text-cyan-50 transition hover:bg-cyanAccent/20 disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => void submitQuestion(suggestion)}
                          disabled={isSubmitting}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
            {isSubmitting ? (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.07] px-4 py-3">
                  <div className="flex items-center gap-1.5" aria-label="El asistente esta escribiendo">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-cyanAccent [animation-delay:-0.24s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-cyanAccent [animation-delay:-0.12s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-cyanAccent" />
                  </div>
                </div>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <form className="space-y-2 border-t border-white/10 bg-[#071123] p-3" onSubmit={handleSubmit}>
            <Textarea
              rows={2}
              placeholder="Escribe tu consulta..."
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              disabled={isSubmitting}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submitQuestion(question);
                }
              }}
              className="min-h-16 resize-none border-white/10 bg-white/[0.06] text-slate-100 placeholder:text-slate-400"
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">AEME RAG</p>
              <Button type="submit" disabled={isSubmitting || question.trim().length === 0} className="h-9 rounded-full px-4">
                {isSubmitting ? "Enviando" : "Enviar"}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        className="group flex items-center gap-3 rounded-full border border-cyanAccent/30 bg-[#071123]/95 px-4 py-3 text-left shadow-[0_18px_45px_rgba(2,8,23,0.38)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-cyanAccent/60"
        aria-label={isOpen ? "Cerrar chat AEME" : "Abrir chat AEME"}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#0f6fff] to-[#00c2b8]">
          <BrandLogo className="h-8 w-8" />
        </span>
        <span className="hidden sm:block">
          <span className="block text-sm font-semibold text-white">Chat AEME</span>
          <span className="block text-xs text-slate-300">Consulta la documentacion</span>
        </span>
      </button>
    </div>
  );
}
