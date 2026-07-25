"use client"

import React, { createContext, useContext, useMemo } from "react";

type Messages = { [k: string]: string };
type MessageCatalog = Record<string, Messages>;

type IntlContextValue = {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const IntlContext = createContext<IntlContextValue | undefined>(undefined);

export default function IntlProviderClient({
  defaultLocale,
  messages,
  children,
}: {
  defaultLocale: string;
  messages: MessageCatalog;
  children: React.ReactNode;
}) {
  const [locale, setLocale] = React.useState(defaultLocale);

  const value = useMemo<IntlContextValue>(() => {
    const activeMessages = messages[locale] ?? messages[defaultLocale] ?? {};
    const t = (key: string, vars?: Record<string, string | number>) => {
      let msg = activeMessages[key] ?? key;
      if (vars) {
        for (const k of Object.keys(vars)) {
          msg = msg.replace(new RegExp(`\\{${k}\\}`, "g"), String(vars[k]));
        }
      }
      return msg;
    };

    return { locale, setLocale, t };
  }, [locale, messages, defaultLocale]);

  return <IntlContext.Provider value={value}>{children}</IntlContext.Provider>;
}

export function useT() {
  const ctx = useContext(IntlContext);
  if (!ctx) throw new Error("useT must be used within IntlProviderClient");
  return ctx.t;
}

export function useLocale() {
  const ctx = useContext(IntlContext);
  if (!ctx) throw new Error("useLocale must be used within IntlProviderClient");
  return { locale: ctx.locale, setLocale: ctx.setLocale };
}
