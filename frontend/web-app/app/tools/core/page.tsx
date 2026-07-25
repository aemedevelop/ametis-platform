"use client";

import { ToolShell } from "@/components/tool-shell";
import { useT } from "@/components/IntlProviderClient";

export default function CoreToolPage() {
  const t = useT();

  return (
    <ToolShell title={t("core.page.title")} subtitle={t("core.page.subtitle")}>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel rounded-xl p-5">
          <h2 className="font-display text-xl font-semibold">{t("core.access.title")}</h2>
          <p className="mt-2 text-sm text-slate-300">{t("core.access.subtitle")}</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-200">
            <li>{t("core.access.metric.users")}</li>
            <li>{t("core.access.metric.roles")}</li>
            <li>{t("core.access.metric.checks")}</li>
          </ul>
        </section>
        <section className="panel rounded-xl p-5">
          <h2 className="font-display text-xl font-semibold">{t("core.subscriptions.title")}</h2>
          <p className="mt-2 text-sm text-slate-300">{t("core.subscriptions.subtitle")}</p>
          <div className="mt-4 grid gap-2 text-sm text-slate-200">
            <div className="rounded-lg bg-brand-500/20 px-3 py-2">{t("core.subscriptions.enterprise")}</div>
            <div className="rounded-lg bg-brand-500/20 px-3 py-2">{t("core.subscriptions.business")}</div>
            <div className="rounded-lg bg-brand-500/20 px-3 py-2">{t("core.subscriptions.pro")}</div>
            <div className="rounded-lg bg-brand-500/20 px-3 py-2">{t("core.subscriptions.free")}</div>
          </div>
        </section>
      </div>
    </ToolShell>
  );
}
