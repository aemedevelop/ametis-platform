"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { useT } from "@/components/IntlProviderClient";
import { LanguageSwitcher } from "@/components/language-switcher";
import { clearSessionTokens } from "@/lib/session";

type AuthProfile = {
  name: string;
  email: string;
};

function readStoredToken(): string | null {
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

function buildProfileFromToken(token: string | null): AuthProfile | null {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  const name = String(payload.name || payload.preferred_username || payload.email || "");
  const email = String(payload.email || "");
  if (!name && !email) return null;
  return {
    name: name || email,
    email
  };
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function TopBar() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDetailsElement | null>(null);
  const isAuthenticated = Boolean(profile);
  const hubBaseUrl = process.env.NEXT_PUBLIC_HUB_URL ?? "http://localhost:3000";
  const newsletterWebUrl = (process.env.NEXT_PUBLIC_NEWSLETTER_WEB_URL ?? "http://localhost:3100").replace(/\/$/, "");
  const query = searchParams.toString();
  const currentPath = `${pathname || "/"}${query ? `?${query}` : ""}`;
  const safeRedirectTarget = currentPath.startsWith("/auth/") ? "/" : currentPath;
  const appLoginUrl = `${newsletterWebUrl}/auth/login`;
  const encodedCurrent = encodeURIComponent(safeRedirectTarget);
  const loginUrl = `/auth/login?redirect=${encodedCurrent}`;
  const registerUrl = `${hubBaseUrl}/register?redirect=${encodeURIComponent(appLoginUrl)}`;
  const initials = useMemo(() => (profile ? initialsFor(profile.name) : ""), [profile]);

  useEffect(() => {
    setProfile(buildProfileFromToken(readStoredToken()));

    function handleStorageChange(event: StorageEvent) {
      if (event.key === "core_access_token") {
        setProfile(buildProfileFromToken(readStoredToken()));
      }
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (profileMenuOpen && profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setProfileMenuOpen(false);
      }
    }

    window.addEventListener("storage", handleStorageChange);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileMenuOpen]);

  function handleLogout() {
    clearSessionTokens();
    setProfile(null);
    setProfileMenuOpen(false);
    router.push("/auth/login");
  }

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[#2c4879] bg-[linear-gradient(90deg,#0e2550_0%,#19386f_34%,#254b8f_52%,#19386f_70%,#0e2550_100%)] text-white shadow-[0_12px_30px_rgba(8,22,46,0.28)]">
      <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-3 font-display text-xl font-bold tracking-tight text-white">
            <BrandLogo className="h-7 w-7" />
            <span>{t("newsletter.workspace.title")}</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {!isAuthenticated ? (
            <>
              <Link
                href={registerUrl}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#184588]"
              >
                {t("actions.createAccount")}
              </Link>
              <Link
                href={loginUrl}
                className="rounded-lg border border-white/35 px-3 py-1.5 text-xs font-semibold text-white"
              >
                {t("actions.login")}
              </Link>
            </>
          ) : null}
          <LanguageSwitcher />
          {isAuthenticated ? (
            <details
              className="group relative"
              open={profileMenuOpen}
              onToggle={(event) => setProfileMenuOpen((event.currentTarget as HTMLDetailsElement).open)}
              ref={profileMenuRef}
            >
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-white/30 bg-white/10 px-2 py-1 text-left text-xs font-semibold text-white shadow-sm transition hover:bg-white/20">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#82a5de]/35 text-[11px] font-bold text-white">
                  {initials}
                </span>
                <span className="text-[10px] text-white/80">{profileMenuOpen ? "▴" : "▾"}</span>
              </summary>
              <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-[#6d8fca]/40 bg-[#0f274f] p-2 shadow-[0_16px_30px_rgba(5,15,34,0.35)]">
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold text-white">{profile?.name}</p>
                  {profile?.email ? <p className="text-[11px] text-[#bed1f2]">{profile.email}</p> : null}
                </div>
                <div className="my-1 h-px bg-white/20" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-md px-3 py-2 text-left text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20"
                >
                  {t("actions.logout")}
                </button>
              </div>
            </details>
          ) : null}
        </div>
      </div>
    </header>
  );
}
