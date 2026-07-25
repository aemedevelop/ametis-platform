"use client";

import { KpiCard } from "@/components/newsletter/kpi-card";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/components/IntlProviderClient";

export default function NewsletterOverviewPage() {
  const t = useT();

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <KpiCard title={t("newsletter.kpi.sources")} value="12" hint={t("newsletter.kpi.sources.hint")} />
        <KpiCard title={t("newsletter.kpi.projects")} value="3" hint={t("newsletter.kpi.projects.hint")} />
        <KpiCard title={t("newsletter.kpi.scheduled")} value="5" hint={t("newsletter.kpi.scheduled.hint")} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("newsletter.pipeline.title")}</CardTitle>
            <CardDescription>{t("newsletter.pipeline.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-[var(--line)] p-3">
                <p className="text-xs uppercase text-slate-400">{t("newsletter.pipeline.ingested")}</p>
                <p className="mt-2 text-lg font-semibold">124 {t("newsletter.pipeline.items")}</p>
                <Badge className="mt-2">{t("newsletter.pipeline.last24h")}</Badge>
              </div>
              <div className="rounded-lg border border-[var(--line)] p-3">
                <p className="text-xs uppercase text-slate-400">{t("newsletter.pipeline.curated")}</p>
                <p className="mt-2 text-lg font-semibold">18 {t("newsletter.pipeline.items")}</p>
                <Badge variant="success" className="mt-2">{t("newsletter.pipeline.approved")}</Badge>
              </div>
              <div className="rounded-lg border border-[var(--line)] p-3">
                <p className="text-xs uppercase text-slate-400">{t("newsletter.pipeline.drafts")}</p>
                <p className="mt-2 text-lg font-semibold">7 {t("newsletter.pipeline.draftsValue")}</p>
                <Badge variant="warning" className="mt-2">{t("newsletter.pipeline.needsReview")}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("newsletter.next.title")}</CardTitle>
            <CardDescription>{t("newsletter.next.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="rounded-lg border border-[var(--line)] p-3">
                <p className="text-sm font-semibold">{t("newsletter.next.itemTitle")}</p>
                <p className="mt-1 text-xs text-slate-400">{t("newsletter.next.scheduled")}</p>
              </div>
              <div className="rounded-lg border border-[var(--line)] p-3">
                <p className="text-xs text-slate-300">{t("newsletter.next.categories")}</p>
                <p className="mt-2 text-sm">{t("newsletter.next.categoriesValue")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
