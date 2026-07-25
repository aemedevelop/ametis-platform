"use client";

import Link from "next/link";
import { SIDEBAR_GROUPS } from "@/lib/navigation";
import { useT } from "@/components/IntlProviderClient";
import { BrandLogo } from "@/components/brand-logo";

export function Sidebar() {
  const t = useT();

  return (
    <aside className="panel hidden h-[calc(100vh-32px)] w-72 rounded-2xl p-5 shadow-panel lg:block">
      <div className="mb-8">
        <p className="inline-flex items-center gap-2 font-display text-xl font-semibold tracking-tight">
          <BrandLogo className="h-6 w-6 shrink-0" />
          <span>{t("brand.name")}</span>
        </p>
        <p className="mt-1 text-sm text-slate-300">{t("sidebar.subtitle")}</p>
      </div>

      <div className="space-y-5">
        {SIDEBAR_GROUPS.map((group, groupIndex) => (
          <nav key={group.titleKey} className="space-y-1">
            <p className="px-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">{t(group.titleKey)}</p>
            {group.items.map((item, itemIndex) => {
              const highlighted = groupIndex === 0 && itemIndex === 0;
              return (
                <Link
                  key={item.labelKey}
                  href={item.href}
                  className={`block rounded-lg px-3 py-2 text-sm transition ${
                    highlighted
                      ? "bg-brand-500/20 text-cyanAccent"
                      : "text-slate-300 hover:bg-brand-400/10 hover:text-slate-100"
                  }`}
                >
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>
        ))}
      </div>
    </aside>
  );
}
