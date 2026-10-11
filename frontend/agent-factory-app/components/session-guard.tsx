"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { refreshSession } from "@/lib/auth-client";
import { clearSession, getAuthToken, getRefreshToken, isAuthTokenExpired, storeSessionTokens } from "@/lib/session";
import { useT } from "@/components/IntlProviderClient";

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useT();
  // /client/* tiene su propio acceso (usuario y contraseña del agente), ajeno a esta sesión.
  const isPublicPath = pathname.startsWith("/auth/") || pathname.startsWith("/client/");
  const [ready, setReady] = useState(isPublicPath);

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

    if (pathname.startsWith("/auth/")) {
      return;
    }
    setReady(false);
    validateSession();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!ready && !isPublicPath) return <main className="center-screen" role="status">{t("common.loadingSession")}</main>;
  return children;
}
