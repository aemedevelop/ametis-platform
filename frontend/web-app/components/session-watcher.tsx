"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { clearSessionTokens } from "@/lib/api";

function readAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("core_access_token") || sessionStorage.getItem("core_access_token");
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function tokenExpiresAtMs(token: string): number | null {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== "number") return null;
  return exp * 1000;
}

export function SessionWatcher() {
  const router = useRouter();
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  function handleExpired() {
    clearSessionTokens();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("auth:expired"));
      const redirect = encodeURIComponent(window.location.href);
      router.replace(`/login?reason=expired&redirect=${redirect}`);
      return;
    }
    router.replace("/login?reason=expired");
  }

  function scheduleExpiry() {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    const token = readAccessToken();
    if (!token) return;
    const expiresAt = tokenExpiresAtMs(token);
    if (!expiresAt) return;
    const now = Date.now();
    if (expiresAt <= now + 500) {
      handleExpired();
      return;
    }
    const delay = expiresAt - now + 500;
    timeoutRef.current = window.setTimeout(handleExpired, delay);
  }

  useEffect(() => {
    scheduleExpiry();

    function handleStorageChange(event: StorageEvent) {
      if (event.key === "core_access_token") {
        scheduleExpiry();
      }
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        scheduleExpiry();
      }
    }

    window.addEventListener("storage", handleStorageChange);
    document.addEventListener("visibilitychange", handleVisibility);
    intervalRef.current = window.setInterval(scheduleExpiry, 30000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, []);

  return null;
}
