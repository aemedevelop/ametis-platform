import "./globals.css";
import type { Metadata } from "next";
import ThemeProviderClient from "@/components/ThemeProviderClient";
import IntlProviderClient from "@/components/IntlProviderClient";
import { QueryProvider } from "@/components/query-provider";
import { NewsletterShell } from "@/components/newsletter-shell";
import { SessionWatcher } from "@/components/session-watcher";
import es from "@/locales/es.json";
import en from "@/locales/en.json";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "AMETIS Newsletter",
  description: "Newsletter product app aligned with AMETIS Hub"
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
            <QueryProvider>
              <Suspense fallback={null}>
                <NewsletterShell>{children}</NewsletterShell>
              </Suspense>
            </QueryProvider>
          </IntlProviderClient>
        </ThemeProviderClient>
      </body>
    </html>
  );
}
