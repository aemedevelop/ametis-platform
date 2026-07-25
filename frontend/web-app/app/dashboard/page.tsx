"use client";

import { useEffect, useState } from "react";
import { AnalyticsChart } from "@/components/analytics-chart";
import { AuthorizationPlayground } from "@/components/authorization-playground";
import { KpiGrid } from "@/components/kpi-grid";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import { useT } from "@/components/IntlProviderClient";
import { fetchHealth } from "@/lib/api";

export default function DashboardPage() {
  const t = useT();
  const [healthStatus, setHealthStatus] = useState("loading");

  useEffect(() => {
    let active = true;

    fetchHealth()
      .then((health) => {
        if (active) setHealthStatus(health.status);
      })
      .catch(() => {
        if (active) setHealthStatus("unreachable");
      });

    return () => {
      active = false;
    };
  }, []);

  const statusClassName =
    healthStatus === "ok" ? "bg-cyanAccent/15 text-cyanAccent" : "bg-rose-500/20 text-rose-300";

  return (
    <main className="p-4 lg:p-6">
      <TopBar />
      <div className="mx-auto flex max-w-[1480px] gap-4">
        <Sidebar />

        <section className="w-full">
          <header className="panel mb-4 rounded-2xl px-5 py-4 shadow-panel">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-display text-2xl font-semibold tracking-tight">{t("dashboard.title")}</p>
                <p className="text-sm text-slate-300">{t("dashboard.subtitle")}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassName}`}>
                  {t("dashboard.coreApiStatus", { status: healthStatus })}
                </span>
                <a
                  href="http://localhost:8000/swagger-ui.html"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-brand-300/40 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:bg-brand-400/20"
                >
                  {t("nav.docs")}
                </a>
              </div>
            </div>
          </header>

          <KpiGrid />

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
            <AnalyticsChart />
            <AuthorizationPlayground />
          </div>
        </section>
      </div>
    </main>
  );
}
