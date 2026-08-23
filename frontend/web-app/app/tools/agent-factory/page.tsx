"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ToolShell } from "@/components/tool-shell";

export default function AgentFactoryToolPage() {
  const externalUrl = process.env.NEXT_PUBLIC_AGENT_FACTORY_WEB_URL ?? "https://ametis.agent-factory.aemetech.com";

  useEffect(() => {
    window.location.href = externalUrl;
  }, [externalUrl]);

  return (
    <ToolShell title="Fábrica de agentes" subtitle="Gestiona el conocimiento documental de tus agentes.">
      <section className="panel rounded-xl p-5">
        <p className="text-sm text-slate-300">Abriendo la aplicación de gestión documental…</p>
        <Link className="mt-4 inline-flex rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white" href={externalUrl}>
          Abrir Agent Factory
        </Link>
      </section>
    </ToolShell>
  );
}
