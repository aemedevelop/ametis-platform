"use client";

import { createContext, useContext, useMemo, useState } from "react";

type Messages = Record<string, string>;

type IntlContextValue = {
  locale: string;
  messages: Messages;
  setLocale: (locale: string) => void;
};

const IntlContext = createContext<IntlContextValue | null>(null);

export default function IntlProviderClient({
  defaultLocale,
  messages,
  children
}: {
  defaultLocale: string;
  messages: Record<string, Messages>;
  children: React.ReactNode;
}) {
  const [locale, setLocale] = useState(defaultLocale);
  const value = useMemo(
    () => ({ locale, messages: messages[locale] ?? {}, setLocale }),
    [locale, messages]
  );

  return <IntlContext.Provider value={value}>{children}</IntlContext.Provider>;
}

export function useT() {
  const ctx = useContext(IntlContext);
  if (!ctx) {
    return (key: string, vars?: Record<string, string | number>) => formatMessage(key, vars, {});
  }
  return (key: string, vars?: Record<string, string | number>) => formatMessage(key, vars, ctx.messages);
}

export function useLocale() {
  const ctx = useContext(IntlContext);
  return { locale: ctx?.locale ?? "es", setLocale: ctx?.setLocale ?? (() => undefined) };
}

function formatMessage(
  key: string,
  vars: Record<string, string | number> | undefined,
  messages: Messages
) {
  const template = messages[key] ?? key;
  if (!vars) return template;
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)), template);
}
