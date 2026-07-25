"use client";

import "./globals.css";
import ThemeProviderClient from "../web-app/components/ThemeProviderClient";
import IntlProviderClient from "../web-app/components/IntlProviderClient";
import { QueryProvider } from "@/components/query-provider";
import { ProductShell } from "@/components/product-shell";
import es from "../web-app/locales/es.json";
import en from "../web-app/locales/en.json";

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
            <QueryProvider>
              <ProductShell>{children}</ProductShell>
            </QueryProvider>
          </IntlProviderClient>
        </ThemeProviderClient>
      </body>
    </html>
  );
}
