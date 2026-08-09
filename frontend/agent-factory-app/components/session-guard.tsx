"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { clearSession, getAuthToken, isAuthTokenExpired } from "@/lib/session";
import { useT } from "@/components/IntlProviderClient";

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useT();
  const [ready, setReady] = useState(pathname.startsWith("/auth/"));

  useEffect(() => {
    if (pathname.startsWith("/auth/")) {
      return;
    }
    const token = getAuthToken();
    if (!token || isAuthTokenExpired(token)) {
      clearSession();
      window.location.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    const timeout = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  if (!ready) return <main className="center-screen" role="status">{t("common.loadingSession")}</main>;
  return children;
}
