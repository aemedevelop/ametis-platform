import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { SessionGuard } from "@/components/session-guard";
import IntlProviderClient from "@/components/IntlProviderClient";
import es from "@/locales/es.json";
import en from "@/locales/en.json";
import ThemeProviderClient from "@/components/ThemeProviderClient";

export const metadata: Metadata = {
  title: es["metadata.title"],
  description: es["metadata.description"]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ThemeProviderClient>
          <IntlProviderClient defaultLocale="es" messages={{ es, en }}>
            <SessionGuard>
              <AppShell>{children}</AppShell>
            </SessionGuard>
          </IntlProviderClient>
        </ThemeProviderClient>
      </body>
    </html>
  );
}
