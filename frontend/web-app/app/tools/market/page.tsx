"use client";

import { ToolShell } from "@/components/tool-shell";
import { useT } from "@/components/IntlProviderClient";

export default function MarketToolPage() {
  const t = useT();

  return (
    <ToolShell title={t("market.page.title")} subtitle={t("market.page.subtitle")}>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="panel rounded-xl p-5">
          <h2 className="font-display text-xl font-semibold">{t("market.radar.title")}</h2>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            <div className="rounded-lg bg-brand-500/20 p-3 text-sm">{t("market.radar.growth")}</div>
            <div className="rounded-lg bg-brand-500/20 p-3 text-sm">{t("market.radar.newEntrants")}</div>
            <div className="rounded-lg bg-brand-500/20 p-3 text-sm">{t("market.radar.risk")}</div>
            <div className="rounded-lg bg-brand-500/20 p-3 text-sm">{t("market.radar.opportunities")}</div>
          </div>
        </section>
        <section className="panel rounded-xl p-5">
          <h2 className="font-display text-xl font-semibold">{t("market.alerts.title")}</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            <li className="rounded-lg bg-slate-900/40 p-3">{t("market.alerts.item1")}</li>
            <li className="rounded-lg bg-slate-900/40 p-3">{t("market.alerts.item2")}</li>
            <li className="rounded-lg bg-slate-900/40 p-3">{t("market.alerts.item3")}</li>
          </ul>
        </section>
      </div>
    </ToolShell>
  );
}
