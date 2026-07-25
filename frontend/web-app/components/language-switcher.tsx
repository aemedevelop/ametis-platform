"use client";

import { useLocale } from "@/components/IntlProviderClient";
import { useT } from "@/components/IntlProviderClient";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const t = useT();

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{t("language.label")}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value)}
        className="peer h-8 appearance-none rounded-md border border-[var(--line)] bg-slate-900/40 px-2 pr-7 text-xs font-semibold text-slate-100 outline-none transition hover:bg-slate-800/50"
        aria-label={t("language.label")}
      >
        <option value="es">{t("language.es")}</option>
        <option value="en">{t("language.en")}</option>
      </select>
      <span className="pointer-events-none absolute right-2 text-[10px] text-[var(--text-muted)] transition-transform peer-focus:-rotate-180">▾</span>
    </label>
  );
}
