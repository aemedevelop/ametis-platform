"use client";

import type { KpiCard } from "@/lib/types";
import { useT } from "@/components/IntlProviderClient";

const kpis: KpiCard[] = [
  { label: "dashboard.kpi.activeTenants", value: "128", delta: "+8.4%", trend: "up" },
  { label: "dashboard.kpi.authorizationChecks", value: "42.9k", delta: "+15.1%", trend: "up" },
  { label: "dashboard.kpi.retention", value: "92.3%", delta: "+1.8%", trend: "up" },
  { label: "dashboard.kpi.operationalAlerts", value: "3", delta: "-40%", trend: "down" }
];

function trendColor(trend: KpiCard["trend"]) {
  if (trend === "up") return "text-cyanAccent";
  if (trend === "down") return "text-orange-300";
  return "text-slate-300";
}

export function KpiGrid() {
  const t = useT();

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <article key={kpi.label} className="panel rounded-xl p-4 shadow-panel">
          <p className="text-sm text-slate-300">{t(kpi.label)}</p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight">{kpi.value}</p>
          <p className={`mt-2 text-xs font-medium ${trendColor(kpi.trend)}`}>{kpi.delta}</p>
        </article>
      ))}
    </section>
  );
}
