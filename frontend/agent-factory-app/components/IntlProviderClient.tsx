"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Messages = Record<string, string>;
type MessageCatalog = Record<string, Messages>;

type IntlContextValue = {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const LOCALE_STORAGE_KEY = "agent_factory_locale";
const IntlContext = createContext<IntlContextValue | undefined>(undefined);

export default function IntlProviderClient({
  defaultLocale,
  messages,
  children
}: {
  defaultLocale: string;
  messages: MessageCatalog;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState(defaultLocale);

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    const browserLocale = window.navigator.language.split("-")[0];
    const initialLocale = storedLocale && messages[storedLocale]
      ? storedLocale
      : messages[browserLocale] ? browserLocale : defaultLocale;
    document.documentElement.lang = initialLocale;
    const timeout = window.setTimeout(() => setLocaleState(initialLocale), 0);
    return () => window.clearTimeout(timeout);
  }, [defaultLocale, messages]);

  const value = useMemo<IntlContextValue>(() => {
    const setLocale = (nextLocale: string) => {
      if (!messages[nextLocale]) return;
      window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
      document.documentElement.lang = nextLocale;
      setLocaleState(nextLocale);
    };
    const activeMessages = messages[locale] ?? messages[defaultLocale] ?? {};
    const t = (key: string, vars?: Record<string, string | number>) => {
      let message = activeMessages[key] ?? messages[defaultLocale]?.[key] ?? key;
      for (const [name, value] of Object.entries(vars ?? {})) {
        message = message.replace(new RegExp(`\\{${name}\\}`, "g"), String(value));
      }
      return message;
    };

    return { locale, setLocale, t };
  }, [defaultLocale, locale, messages]);

  return <IntlContext.Provider value={value}>{children}</IntlContext.Provider>;
}

export function useT() {
  const context = useContext(IntlContext);
  if (!context) throw new Error("useT must be used within IntlProviderClient");
  return context.t;
}

export function useLocale() {
  const context = useContext(IntlContext);
  if (!context) throw new Error("useLocale must be used within IntlProviderClient");
  return { locale: context.locale, setLocale: context.setLocale };
}
