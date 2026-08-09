"use client";

import { useT } from "@/components/IntlProviderClient";
import { useThemeMode, type ThemeMode } from "@/components/ThemeProviderClient";

export function ThemeSwitcher() {
  const { mode, setMode } = useThemeMode();
  const t = useT();
  const nextMode: ThemeMode = mode === "dark" ? "light" : "dark";
  const currentLabel = t(`theme.${mode}`);
  const nextLabel = t(`theme.${nextMode}`);

  return (
    <button
      className="theme-switcher"
      type="button"
      onClick={() => setMode(nextMode)}
      title={t("theme.toggleTitle", { current: currentLabel, next: nextLabel })}
      aria-label={t("theme.toggleAria", { current: currentLabel, next: nextLabel })}
    >
      <ThemeIcon mode={mode} />
    </button>
  );
}

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === "dark") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" /></svg>;
}
