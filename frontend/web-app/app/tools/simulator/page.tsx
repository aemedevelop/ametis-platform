"use client";

import { ToolShell } from "@/components/tool-shell";
import { useT } from "@/components/IntlProviderClient";

export default function SimulatorToolPage() {
  const t = useT();

  return (
    <ToolShell title={t("simulator.page.title")} subtitle={t("simulator.page.subtitle")}>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel rounded-xl p-5">
          <h2 className="font-display text-xl font-semibold">{t("simulator.base.title")}</h2>
          <div className="mt-4 grid gap-3">
            <input className="rounded-lg border border-slate-500/30 bg-slate-950/40 px-3 py-2 text-sm" placeholder={t("simulator.base.revenue")} />
            <input className="rounded-lg border border-slate-500/30 bg-slate-950/40 px-3 py-2 text-sm" placeholder={t("simulator.base.fixedCosts")} />
            <input className="rounded-lg border border-slate-500/30 bg-slate-950/40 px-3 py-2 text-sm" placeholder={t("simulator.base.variableCosts")} />
            <button className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white">
              {t("simulator.base.action")}
            </button>
          </div>
        </section>
        <section className="panel rounded-xl p-5">
          <h2 className="font-display text-xl font-semibold">{t("simulator.results.title")}</h2>
          <div className="mt-4 space-y-2 text-sm text-slate-200">
            <div className="rounded-lg bg-brand-500/20 p-3">{t("simulator.results.ebitda")}</div>
            <div className="rounded-lg bg-brand-500/20 p-3">{t("simulator.results.breakEven")}</div>
            <div className="rounded-lg bg-brand-500/20 p-3">{t("simulator.results.risk")}</div>
          </div>
        </section>
      </div>
    </ToolShell>
  );
}
