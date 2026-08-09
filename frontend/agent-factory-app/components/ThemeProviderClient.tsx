"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const STORAGE_KEY = "ametis-theme-mode";
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export default function ThemeProviderClient({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    const storedMode = window.localStorage.getItem(STORAGE_KEY);
    const systemMode: ThemeMode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const initialMode = storedMode === "light" || storedMode === "dark" ? storedMode : systemMode;
    const timeout = window.setTimeout(() => setModeState(initialMode), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    setMode: (nextMode) => {
      window.localStorage.setItem(STORAGE_KEY, nextMode);
      setModeState(nextMode);
    }
  }), [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useThemeMode must be used within ThemeProviderClient");
  return context;
}
