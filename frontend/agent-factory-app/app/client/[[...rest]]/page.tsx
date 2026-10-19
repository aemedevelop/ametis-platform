"use client";

import { useT } from "@/components/IntlProviderClient";

/**
 * Cualquier ruta de /client sin página propia (p. ej. si el cliente recorta la
 * URL compartida hasta /client/). Pantalla neutra, sin carcasa ni enlaces a la
 * plataforma: desde la zona del cliente no se debe poder llegar a la del
 * consultor, aunque el navegador tenga una sesión de plataforma abierta.
 * /client/analytics/[publicId] es más específica y tiene prioridad sobre esta.
 */
export default function ClientInvalidLinkPage() {
  const t = useT();
  return (
    <main className="center-screen">
      <section className="client-login" aria-labelledby="client-invalid-title">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">A</span>
          <span><strong>{t("brand.company")}</strong><small>{t("brand.product")}</small></span>
        </div>
        <h1 id="client-invalid-title">{t("clientAnalytics.invalidLinkTitle")}</h1>
        <p>{t("clientAnalytics.invalidLinkDescription")}</p>
      </section>
    </main>
  );
}
