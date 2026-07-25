"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import { useT } from "@/components/IntlProviderClient";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/newsletter", label: "Overview" },
  { href: "/newsletter/sources", label: "Sources" },
  { href: "/newsletter/projects", label: "Projects" }
];

export function NewsletterShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useT();

  return (
    <main className="p-4 lg:p-6">
      <TopBar />
      <div className="mx-auto flex max-w-[1480px] gap-4">
        <Sidebar />

        <section className="w-full">
          <header className="panel mb-4 rounded-2xl px-5 py-4 shadow-panel">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-display text-2xl font-semibold tracking-tight">{t("newsletter.app.title")}</p>
                <p className="text-sm text-slate-300">
                  {t("newsletter.app.subtitle")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button>{t("newsletter.actions.newPublication")}</Button>
                <Button variant="outline">{t("newsletter.actions.inviteEditor")}</Button>
              </div>
            </div>
          </header>

          <section className="panel flex flex-col gap-4 rounded-2xl p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t("newsletter.workspace.label")}</p>
              <h2 className="font-display text-2xl font-semibold">{t("newsletter.workspace.title")}</h2>
              <p className="text-sm text-slate-300">{t("newsletter.workspace.subtitle")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline">{t("newsletter.actions.syncSources")}</Button>
              <Button>{t("newsletter.actions.reviewDrafts")}</Button>
            </div>
          </section>

          <nav className="mt-4 flex flex-wrap gap-2">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full border border-transparent px-4 py-1 text-xs font-semibold transition",
                    active
                      ? "bg-brand-500/20 text-cyanAccent"
                      : "border-[var(--line)] text-slate-300 hover:bg-brand-400/10"
                  )}
                >
                  {t(`newsletter.nav.${item.label.toLowerCase()}`)}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4">{children}</div>
        </section>
      </div>
    </main>
  );
}
