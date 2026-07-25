import type { Metadata } from "next";
import "./globals.css";
import IntlProviderClient from "../components/IntlProviderClient";
import ThemeProviderClient from "../components/ThemeProviderClient";
import { SessionWatcher } from "../components/session-watcher";
import es from "../locales/es.json";
import en from "../locales/en.json";

export const metadata: Metadata = {
  title: "Ametis: Plataforma de Inteligencia Empresarial",
  description: es["meta.description"],
  icons: {
    icon: "/logo-ametis.png",
    shortcut: "/logo-ametis.png",
    apple: "/logo-ametis.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const defaultLocale = "es";
  const messages = {
    es: es as { [k: string]: string },
    en: en as { [k: string]: string }
  };

  return (
    <html lang={defaultLocale}>
      <body>
        <ThemeProviderClient>
          <IntlProviderClient defaultLocale={defaultLocale} messages={messages}>
            <SessionWatcher />
            {children}
          </IntlProviderClient>
        </ThemeProviderClient>
      </body>
    </html>
  );
}
