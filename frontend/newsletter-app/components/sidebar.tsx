"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/IntlProviderClient";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", labelKey: "newsletter.nav.agent", match: (pathname: string) => pathname === "/" },
  { href: "/editor", labelKey: "newsletter.nav.editor", match: (pathname: string) => pathname.startsWith("/editor") }
];

const CONFIG_NAV = [
  { href: "/projects", labelKey: "newsletter.nav.projects", match: (pathname: string) => pathname.startsWith("/projects") },
  { href: "/sources", labelKey: "newsletter.nav.sources", match: (pathname: string) => pathname.startsWith("/sources") }
];

type SidebarProps = {
  keepVisible: boolean;
  onKeepVisibleChange: (next: boolean) => void;
};

export function Sidebar({ keepVisible, onKeepVisibleChange }: SidebarProps) {
  const t = useT();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(true);

  return (
    <aside className="panel h-full w-72 rounded-2xl p-5 shadow-panel">
      <div className="mb-6 flex items-center justify-start rounded-lg bg-white px-3 py-2">
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#4b5f80]">
          <input
            type="checkbox"
            checked={keepVisible}
            onChange={(event) => onKeepVisibleChange(event.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-[#9fb1c9] bg-white text-[#1f5db8] accent-[#1f5db8] [color-scheme:light] focus:ring-[#1f5db8]"
          />
          <span>Mantener visible</span>
        </label>
      </div>
      <div className="mb-5 h-px w-full bg-gradient-to-r from-[#d9e3f2] via-[#b9c9e2] to-[#d9e3f2]" aria-hidden="true" />
      <div className="rounded-xl border border-[#dbe5f2] bg-[#f7faff]">
        <button
          type="button"
          onClick={() => setConfigOpen((prev) => !prev)}
          className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm font-semibold tracking-[-0.01em] text-[#1f3b6b]"
          aria-expanded={configOpen}
          aria-controls="configuration-menu"
        >
          <span className="inline-flex items-center gap-2">
            <SectionIcon kind="settings" />
            {t("newsletter.menu.configuration")}
          </span>
          <svg
            viewBox="0 0 20 20"
            className={cn("h-4 w-4 transition-transform", configOpen ? "rotate-90" : "rotate-0")}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="m7 5 6 5-6 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {configOpen ? (
          <nav id="configuration-menu" className="space-y-1 border-t border-[#e2eaf5] px-2 py-2">
            {CONFIG_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold leading-tight tracking-[-0.01em] transition",
                  item.match(pathname)
                    ? "bg-[#edf4ff] text-[#1f3b6b] underline underline-offset-4 decoration-[#1f5db8] decoration-2"
                    : "bg-transparent text-[#2f4c74] hover:bg-[#f2f7ff] hover:text-[#1f3b6b]"
                )}
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>

      <div className="mt-3 rounded-xl border border-[#dbe5f2] bg-[#f7faff]">
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm font-semibold tracking-[-0.01em] text-[#1f3b6b]"
          aria-expanded={menuOpen}
          aria-controls="create-article-menu"
        >
          <span className="inline-flex items-center gap-2">
            <SectionIcon kind="create" />
            {t("newsletter.menu.createArticle")}
          </span>
          <svg
            viewBox="0 0 20 20"
            className={cn("h-4 w-4 transition-transform", menuOpen ? "rotate-90" : "rotate-0")}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="m7 5 6 5-6 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {menuOpen ? (
          <nav id="create-article-menu" className="space-y-1 border-t border-[#e2eaf5] px-2 py-2">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold leading-tight tracking-[-0.01em] transition",
                  item.match(pathname)
                    ? "bg-[#edf4ff] text-[#1f3b6b] underline underline-offset-4 decoration-[#1f5db8] decoration-2"
                    : "bg-transparent text-[#2f4c74] hover:bg-[#f2f7ff] hover:text-[#1f3b6b]"
                )}
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </aside>
  );
}

function SectionIcon({ kind }: { kind: "create" | "settings" }) {
  if (kind === "create") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3.5" y="3.5" width="13" height="13" rx="3" />
        <path d="M10 6.5v7M6.5 10h7" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="10" cy="10" r="2.4" />
      <path d="M10 3.4v1.7M10 14.9v1.7M3.4 10h1.7M14.9 10h1.7M5.2 5.2l1.2 1.2M13.6 13.6l1.2 1.2M5.2 14.8l1.2-1.2M13.6 6.4l1.2-1.2" />
      <circle cx="10" cy="10" r="5.2" />
    </svg>
  );
}
