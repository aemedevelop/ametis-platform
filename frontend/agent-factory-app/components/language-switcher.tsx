"use client";

import { useLocale, useT } from "@/components/IntlProviderClient";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const t = useT();

  return (
    <label className="language-switcher">
      <span className="sr-only">{t("language.label")}</span>
      <select value={locale} onChange={(event) => setLocale(event.target.value)} aria-label={t("language.label")}>
        <option value="es">{t("language.es")}</option>
        <option value="en">{t("language.en")}</option>
      </select>
      <span className="language-chevron" aria-hidden="true">▾</span>
    </label>
  );
}
