"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HEADER_NAV_ITEMS, SOLUTION_VERTICALS, TOOL_NAV_ITEMS } from "@/lib/navigation";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { LanguageSwitcher } from "@/components/language-switcher";
import { BrandLogo } from "@/components/brand-logo";
import { useT } from "@/components/IntlProviderClient";
import { clearSessionTokens } from "@/lib/api";

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
    email,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDesktopVerticalId, setOpenDesktopVerticalId] = useState<string | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [solutionsMenuOpen, setSolutionsMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDetailsElement | null>(null);
  const solutionsMenuRef = useRef<HTMLDivElement | null>(null);

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const isAuthenticated = Boolean(profile);

  useEffect(() => {
    setProfile(buildProfileFromToken(readStoredToken()));

    function handleStorageChange(event: StorageEvent) {
      if (event.key === "core_access_token") {
        setProfile(buildProfileFromToken(readStoredToken()));
      }
    }

    function handleProfileUpdated(event: Event) {
      const custom = event as CustomEvent<AuthProfile>;
      if (custom.detail) {
        setProfile(custom.detail);
      } else {
        setProfile(buildProfileFromToken(readStoredToken()));
      }
    }

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("profile:updated", handleProfileUpdated as EventListener);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("profile:updated", handleProfileUpdated as EventListener);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (profileMenuOpen && profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setProfileMenuOpen(false);
      }
      if (solutionsMenuOpen && solutionsMenuRef.current && !solutionsMenuRef.current.contains(target)) {
        setSolutionsMenuOpen(false);
        setOpenDesktopVerticalId(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileMenuOpen, solutionsMenuOpen]);

  const initials = useMemo(() => (profile ? initialsFor(profile.name) : ""), [profile]);

  function handleLogout() {
    if (typeof window === "undefined") return;
    clearSessionTokens();
    setProfileMenuOpen(false);
    setProfile(null);
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-30 mb-6 w-full border-b border-[var(--line)] bg-[var(--header-bg)]/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-4 py-3 md:py-3">
        <Link href="/" className="inline-flex items-center gap-3 font-display text-xl font-bold tracking-tight text-[var(--text)] md:text-3xl">
          <BrandLogo className="h-[1.84rem] w-[1.84rem] shrink-0 md:h-[2.1rem] md:w-[2.1rem]" />
          <span>{t("brand.name")}</span>
        </Link>

        <nav className="hidden items-center gap-4 text-sm text-[var(--text-muted)] md:flex">
          {HEADER_NAV_ITEMS.map((item) => (
            item.labelKey === "nav.solutions" ? (
              <div key={item.href} className="relative" ref={solutionsMenuRef}>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:text-cyanAccent focus-visible:outline-none focus-visible:text-cyanAccent"
                  onClick={() => setSolutionsMenuOpen((current) => !current)}
                  aria-expanded={solutionsMenuOpen}
                >
                  {t(item.labelKey)}
                  <span className="text-[10px] text-[var(--text-muted)]">{solutionsMenuOpen ? "▴" : "▾"}</span>
                </button>
                {solutionsMenuOpen ? (
                  <div className="absolute left-0 top-full z-40 mt-0 min-w-56 rounded-lg border border-brand-300/50 bg-[var(--dropdown-bg)] p-2 shadow-panel">
                    <ul className="space-y-1">
                      {SOLUTION_VERTICALS.map((vertical) => {
                        const tools = TOOL_NAV_ITEMS.filter((tool) => vertical.toolHrefs.includes(tool.href));

                        return (
                          <li key={vertical.id} className="rounded-md px-2 py-1 hover:bg-brand-400/10">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenDesktopVerticalId((current) => (current === vertical.id ? null : vertical.id))
                              }
                              className="inline-flex w-full items-center justify-between gap-2 rounded-md px-1 py-1 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] hover:bg-brand-400/10"
                              aria-expanded={openDesktopVerticalId === vertical.id}
                            >
                              <span>{t(vertical.titleKey)}</span>
                              <span>{openDesktopVerticalId === vertical.id ? "▴" : "▾"}</span>
                            </button>
                            {openDesktopVerticalId === vertical.id ? (
                              <ul className="mt-1 space-y-1 border-l border-brand-300/30 pl-2">
                                {tools.map((tool) => (
                                  <li key={tool.href}>
                                    <Link
                                      href={tool.href}
                                      onClick={() => {
                                        setSolutionsMenuOpen(false);
                                        setOpenDesktopVerticalId(null);
                                      }}
                                      className="block rounded-md px-2 py-1.5 text-xs text-[var(--text)] hover:bg-brand-400/15 hover:text-cyanAccent"
                                    >
                                      {t(tool.titleKey)}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="hover:text-cyanAccent"
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noreferrer" : undefined}
              >
                {t(item.labelKey)}
              </Link>
            )
          ))}
        </nav>

        <div className="hidden items-center gap-1 md:flex">
          {!isAuthenticated ? (
            <>
              <Link
                href="/register"
                className="rounded-lg border border-[var(--line)] bg-brand-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-brand-400"
              >
                {t("actions.createAccount")}
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-[var(--line)] px-3 py-1 text-xs font-semibold text-[var(--text)] transition hover:bg-brand-400/20"
              >
                {t("actions.login")}
              </Link>
            </>
          ) : null}
          <LanguageSwitcher />
          <ThemeSwitcher />
          {isAuthenticated ? (
            <details
              className="group relative"
              open={profileMenuOpen}
              onToggle={(event) => setProfileMenuOpen((event.currentTarget as HTMLDetailsElement).open)}
              ref={profileMenuRef}
            >
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel)]/60 px-2 py-1 text-left text-xs font-semibold text-[var(--text)] shadow-sm transition hover:bg-brand-400/15">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-500/30 text-[11px] font-bold text-white">
                  {initials}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">{profileMenuOpen ? "▴" : "▾"}</span>
              </summary>
              <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-brand-300/30 bg-[var(--dropdown-bg)] p-2 shadow-panel">
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold text-[var(--text)]">{profile?.name}</p>
                  {profile?.email ? <p className="text-[11px] text-[var(--text-muted)]">{profile.email}</p> : null}
                </div>
                <div className="my-1 h-px bg-[var(--line)]" />
                <Link
                  href="/profile"
                  onClick={() => setProfileMenuOpen(false)}
                  className="block rounded-md px-3 py-2 text-xs text-[var(--text)] hover:bg-brand-400/10"
                >
                  {t("actions.editProfile")}
                </Link>
                <Link
                  href="/account"
                  onClick={() => setProfileMenuOpen(false)}
                  className="block rounded-md px-3 py-2 text-xs text-[var(--text)] hover:bg-brand-400/10"
                >
                  {t("nav.account")}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-md px-3 py-2 text-left text-xs font-semibold text-rose-200 hover:bg-rose-500/10"
                >
                  {t("actions.logout")}
                </button>
              </div>
            </details>
          ) : null}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <LanguageSwitcher />
          <ThemeSwitcher />
          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="rounded-lg border border-[var(--line)] px-3 py-1 text-xs font-semibold text-[var(--text)] transition hover:bg-brand-400/20"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-main-menu"
          >
            {mobileMenuOpen ? t("nav.menu.close") : t("nav.menu.open")}
          </button>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div id="mobile-main-menu" className="border-t border-[var(--line)] bg-[var(--header-bg)]/98 px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-2 text-sm text-[var(--text)]">
            {HEADER_NAV_ITEMS.filter((item) => item.labelKey !== "nav.solutions").map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                className="rounded-md px-2 py-2 hover:bg-brand-400/15"
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noreferrer" : undefined}
              >
                {t(item.labelKey)}
              </Link>
            ))}

            <details className="mt-1 rounded-lg border border-transparent p-2 open:border-brand-300/30">
              <summary className="cursor-pointer list-none px-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                {t("nav.solutions")}
              </summary>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {SOLUTION_VERTICALS.map((vertical) => {
                  const tools = TOOL_NAV_ITEMS.filter((tool) => vertical.toolHrefs.includes(tool.href));
                  return (
                    <details key={vertical.id} className="rounded-md border border-brand-300/25 px-1 py-1">
                      <summary className="cursor-pointer list-none px-1 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                        {t(vertical.titleKey)}
                      </summary>
                      <div className="mt-1 grid grid-cols-1 gap-1 border-l border-brand-300/30 pl-2">
                        {tools.map((tool) => (
                          <Link
                            key={tool.href}
                            href={tool.href}
                            onClick={closeMobileMenu}
                            className="rounded-md px-2 py-2 text-xs hover:bg-brand-400/15"
                          >
                            {t(tool.titleKey)}
                          </Link>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            </details>

            {isAuthenticated ? (
              <div className="mt-2 grid gap-2 rounded-lg border border-brand-300/30 p-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-500/30 text-[12px] font-bold text-white">
                    {initials}
                  </span>
                </div>
                <Link
                  href="/profile"
                  onClick={closeMobileMenu}
                  className="rounded-md border border-[var(--line)] px-3 py-2 text-center text-xs font-semibold text-[var(--text)] hover:bg-brand-400/15"
                >
                  {t("actions.editProfile")}
                </Link>
                <Link
                  href="/account"
                  onClick={closeMobileMenu}
                  className="rounded-md border border-[var(--line)] px-3 py-2 text-center text-xs font-semibold text-[var(--text)] hover:bg-brand-400/15"
                >
                  {t("nav.account")}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                    closeMobileMenu();
                  }}
                  className="rounded-md border border-rose-400/30 px-3 py-2 text-center text-xs font-semibold text-rose-200 hover:bg-rose-500/10"
                >
                  {t("actions.logout")}
                </button>
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link
                  href="/register"
                  onClick={closeMobileMenu}
                  className="rounded-lg border border-[var(--line)] bg-brand-500 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-brand-400"
                >
                  {t("actions.createAccount")}
                </Link>
                <Link
                  href="/login"
                  onClick={closeMobileMenu}
                  className="rounded-lg border border-[var(--line)] px-3 py-2 text-center text-xs font-semibold text-[var(--text)] transition hover:bg-brand-400/20"
                >
                  {t("actions.login")}
                </Link>
              </div>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
