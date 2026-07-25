"use client";

import { useThemeMode, type ThemeMode } from "@/components/ThemeProviderClient";
import { useT } from "@/components/IntlProviderClient";

function nextMode(mode: ThemeMode): ThemeMode {
  return mode === "dark" ? "light" : "dark";
}

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === "dark") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
    </svg>
  );
}

export function ThemeSwitcher() {
  const { mode, setMode } = useThemeMode();
  const t = useT();
  const upcoming = nextMode(mode);
  const currentLabel = mode === "dark" ? t("theme.dark") : t("theme.light");
  const upcomingLabel = upcoming === "dark" ? t("theme.dark") : t("theme.light");

  return (
    <button
      type="button"
      onClick={() => setMode(upcoming)}
      title={t("theme.toggleTitle", { current: currentLabel, next: upcomingLabel })}
      aria-label={t("theme.toggleAria", { current: currentLabel, next: upcomingLabel })}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--line)] bg-slate-900/40 text-slate-100 transition hover:bg-slate-800/50"
    >
      <ThemeIcon mode={mode} />
    </button>
  );
}
