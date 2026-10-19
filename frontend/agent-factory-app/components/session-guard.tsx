"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { refreshSession } from "@/lib/auth-client";
import { clearSession, getAuthToken, getRefreshToken, isAuthTokenExpired, storeSessionTokens } from "@/lib/session";
import { useT } from "@/components/IntlProviderClient";
import { isPublicPath } from "@/lib/public-paths";

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useT();
  // Rutas que este guardián NO protege:
  //  - /auth/*   -> las propias pantallas de login/registro.
  //  - /client/* -> zona del cliente final (analíticas de su agente). El cliente
  //    no es usuario de la plataforma: entra con el usuario y contraseña que el
  //    consultor definió al publicar el acceso, y esa sesión es propia (ver
  //    lib/client-analytics-api.ts). Si aquí se le exigiera sesión de consultor,
  //    un navegador sin ella acabaría redirigido a /auth/login -- fallo que no
  //    se ve al probar desde un navegador donde el consultor ya tiene sesión.
  // AppShell aplica la misma exclusión para no pintar el menú de la app.
  const isPublic = isPublicPath(pathname);
  const [ready, setReady] = useState(isPublic);

  useEffect(() => {
    let cancelled = false;

    async function validateSession() {
      const token = getAuthToken();
      if (!token) {
        redirectToLogin();
        return;
      }
      if (isAuthTokenExpired(token)) {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          redirectToLogin();
          return;
        }
        try {
          const tokens = await refreshSession(refreshToken);
          storeSessionTokens(tokens);
        } catch {
          redirectToLogin();
          return;
        }
      }
      if (!cancelled) setReady(true);
    }

    function redirectToLogin() {
      clearSession();
      window.location.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
    }

    if (isPublic) {
      return;
    }
    setReady(false);
    validateSession();
    return () => {
      cancelled = true;
    };
  }, [pathname, isPublic]);

  if (!ready && !isPublic) return <main className="center-screen" role="status">{t("common.loadingSession")}</main>;
  return children;
}
