"use client";

import { NewsletterShell } from "@/components/newsletter/newsletter-shell";
import { QueryProvider } from "@/components/query-provider";

export default function NewsletterLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <NewsletterShell>{children}</NewsletterShell>
    </QueryProvider>
  );
}
