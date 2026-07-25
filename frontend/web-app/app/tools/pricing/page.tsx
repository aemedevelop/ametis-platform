"use client";

import { ToolShell } from "@/components/tool-shell";
import { useT } from "@/components/IntlProviderClient";

export default function PricingToolPage() {
  const t = useT();

  return (
    <ToolShell title={t("pricing.page.title")} subtitle={t("pricing.page.subtitle")}>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel rounded-xl p-5">
          <h2 className="font-display text-xl font-semibold">{t("pricing.margin.title")}</h2>
          <div className="mt-4 grid gap-3">
            <input className="rounded-lg border border-slate-500/30 bg-slate-950/40 px-3 py-2 text-sm" placeholder={t("pricing.margin.unitCost")} />
            <input className="rounded-lg border border-slate-500/30 bg-slate-950/40 px-3 py-2 text-sm" placeholder={t("pricing.margin.targetPrice")} />
            <button className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white">{t("pricing.margin.action")}</button>
          </div>
        </section>
        <section className="panel rounded-xl p-5">
          <h2 className="font-display text-xl font-semibold">{t("pricing.market.title")}</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="rounded-lg bg-brand-500/20 p-3">{t("pricing.market.recommendedPrice")}</div>
            <div className="rounded-lg bg-brand-500/20 p-3">{t("pricing.market.average")}</div>
            <div className="rounded-lg bg-brand-500/20 p-3">{t("pricing.market.elasticity")}</div>
          </div>
        </section>
      </div>
    </ToolShell>
  );
}
