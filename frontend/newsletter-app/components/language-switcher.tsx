"use client";

import { useLocale, useT } from "@/components/IntlProviderClient";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const t = useT();

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{t("language.label")}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value)}
        className="peer h-8 appearance-none rounded-md border border-white/35 bg-white/10 px-2 pr-7 text-xs font-semibold text-white outline-none transition hover:bg-white/15 [color-scheme:light]"
        aria-label={t("language.label")}
      >
        <option value="es" className="bg-white text-[#1f3b6b]">{t("language.es")}</option>
        <option value="en" className="bg-white text-[#1f3b6b]">{t("language.en")}</option>
      </select>
      <span className="pointer-events-none absolute right-2 text-white/80 transition-transform peer-focus:-rotate-180">
        <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor" aria-hidden="true">
          <path d="M5.2 7.2a.75.75 0 0 1 1.06 0L10 10.94l3.74-3.74a.75.75 0 1 1 1.06 1.06l-4.27 4.27a.75.75 0 0 1-1.06 0L5.2 8.26a.75.75 0 0 1 0-1.06Z" />
        </svg>
      </span>
    </label>
  );
}
