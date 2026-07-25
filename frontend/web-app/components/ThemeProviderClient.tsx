"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
};

const STORAGE_KEY = "ametis-theme-mode";
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeProviderClient({ children }: { children: React.ReactNode }) {
  // Start with a deterministic SSR/CSR value to avoid hydration mismatches.
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const resolvedTheme = mode;

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    const initialMode = saved === "light" || saved === "dark" ? saved : getSystemTheme();
    setModeState(initialMode);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.dataset.theme = resolvedTheme;
    html.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const setMode = (nextMode: ThemeMode) => {
    setModeState(nextMode);
    window.localStorage.setItem(STORAGE_KEY, nextMode);
  };

  const value = useMemo(
    () => ({ mode, resolvedTheme, setMode }),
    [mode, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useThemeMode must be used within ThemeProviderClient");
  return context;
}
