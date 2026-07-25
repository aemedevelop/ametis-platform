"use client";

import { useEffect } from "react";
import { useT } from "@/components/IntlProviderClient";
import { ToolShell } from "@/components/tool-shell";
import Link from "next/link";

export default function NewsletterToolPage() {
  const t = useT();
  const externalUrl = process.env.NEXT_PUBLIC_NEWSLETTER_WEB_URL ?? "http://localhost:3100";

  useEffect(() => {
    window.location.href = externalUrl;
  }, [externalUrl]);

  return (
    <ToolShell title={t("newsletter.page.title")} subtitle={t("newsletter.page.subtitle")}>
      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="panel rounded-xl p-5">
          <h2 className="font-display text-xl font-semibold">{t("newsletter.pipeline.title")}</h2>
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            <div className="rounded-lg bg-brand-500/20 p-3 text-sm">{t("newsletter.pipeline.sources")}</div>
            <div className="rounded-lg bg-brand-500/20 p-3 text-sm">{t("newsletter.pipeline.filtered")}</div>
            <div className="rounded-lg bg-brand-500/20 p-3 text-sm">{t("newsletter.pipeline.published")}</div>
          </div>
          <textarea
            className="mt-4 min-h-40 w-full rounded-lg border border-slate-500/30 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-brand-300"
            defaultValue={t("newsletter.pipeline.defaultDraft")}
          />
        </section>
        <section className="panel rounded-xl p-5">
          <h2 className="font-display text-xl font-semibold">{t("newsletter.delivery.title")}</h2>
          <p className="mt-2 text-sm text-slate-300">{t("newsletter.delivery.subtitle")}</p>
          <Link
            href={externalUrl}
            className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
            target="_blank"
            rel="noreferrer"
          >
            {t("newsletter.delivery.action")}
          </Link>
        </section>
      </div>
    </ToolShell>
  );
}
