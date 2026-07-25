import { NewsletterApiError } from "@/lib/newsletter-api";

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

export function resolveNewsletterErrorMessage(
  error: unknown,
  t: TranslateFn,
  fallbackKey: string
): string {
  if (error instanceof NewsletterApiError) {
    if (error.message.includes("Missing tenant context")) return t("newsletter.tenant.required");
    if (error.status === 401 || error.status === 403) return t("newsletter.access.denied");
    if (error.status === 400) return t("newsletter.error.badRequest");
    if (error.status >= 500) return t("newsletter.error.server");
  }
  if (error instanceof Error) {
    if (error.message.includes("Missing tenant context")) return t("newsletter.tenant.required");
    if (error.message.includes("Failed to fetch")) return t("newsletter.error.network");
    if (error.message.includes("status 401") || error.message.includes("status 403")) return t("newsletter.access.denied");
    if (error.message.includes("status 400")) return t("newsletter.error.badRequest");
    if (error.message.includes("status 5")) return t("newsletter.error.server");
  }
  return t(fallbackKey);
}
