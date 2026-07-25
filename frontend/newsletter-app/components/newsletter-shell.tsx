"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { Sidebar } from "@/components/sidebar";
import { useT } from "@/components/IntlProviderClient";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", labelKey: "newsletter.nav.agent" },
  { href: "/editor", labelKey: "newsletter.nav.editor" }
];

const CONFIG_NAV_ITEMS = [
  { href: "/projects", labelKey: "newsletter.nav.projects" },
  { href: "/sources", labelKey: "newsletter.nav.sources" }
];

export function NewsletterShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith("/auth");
  const t = useT();
  const inConfiguration = pathname.startsWith("/sources") || pathname.startsWith("/projects");
  const topNavItems = inConfiguration ? CONFIG_NAV_ITEMS : NAV_ITEMS;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [keepSidebarVisible, setKeepSidebarVisible] = useState(false);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarDesktopRef = useRef<HTMLDivElement>(null);
  const sidebarMobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthRoute) return;
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const updateSidebarForViewport = (event?: MediaQueryListEvent) => {
      const isMobile = event ? event.matches : mediaQuery.matches;
      setSidebarOpen(!isMobile);
    };

    updateSidebarForViewport();
    mediaQuery.addEventListener("change", updateSidebarForViewport);
    return () => mediaQuery.removeEventListener("change", updateSidebarForViewport);
  }, [isAuthRoute]);

  useEffect(() => {
    if (isAuthRoute) return;
    if (!sidebarOpen || keepSidebarVisible) return;

    const checkOutside = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return;
      const onToggle = toggleButtonRef.current?.contains(target);
      const onDesktopSidebar = sidebarDesktopRef.current?.contains(target);
      const onMobileSidebar = sidebarMobileRef.current?.contains(target);
      if (!onToggle && !onDesktopSidebar && !onMobileSidebar) {
        setSidebarOpen(false);
      }
    };

    const onPointerDown = (event: PointerEvent) => checkOutside(event.target);
    const onFocusIn = (event: FocusEvent) => checkOutside(event.target);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [isAuthRoute, sidebarOpen, keepSidebarVisible]);

  if (isAuthRoute) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <main className="min-h-screen">
      <TopBar />

      <div
        className={cn(
          "fixed inset-0 z-20 bg-[#0c1f3e]/35 transition-opacity duration-300 lg:hidden",
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      <aside
        id="newsletter-sidebar-mobile"
        ref={sidebarMobileRef}
        className={cn(
          "fixed left-0 top-[65px] z-30 h-[calc(100vh-65px)] w-72 p-4 transition-transform duration-300 ease-out lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!sidebarOpen}
      >
        <Sidebar keepVisible={keepSidebarVisible} onKeepVisibleChange={setKeepSidebarVisible} />
      </aside>

      <div className="mx-auto max-w-[1480px] px-4 pt-4 lg:px-6 lg:pt-6">
        <div
          className={cn(
            "grid gap-4 transition-[grid-template-columns] duration-300 ease-out lg:grid-cols-[18rem_minmax(0,1fr)]",
            sidebarOpen ? "lg:grid-cols-[18rem_minmax(0,1fr)]" : "lg:grid-cols-[0rem_minmax(0,1fr)]"
          )}
        >
          <aside
            id="newsletter-sidebar-desktop"
            ref={sidebarDesktopRef}
            className={cn(
              "hidden overflow-hidden transition-all duration-300 ease-out lg:block",
              sidebarOpen ? "w-72 opacity-100" : "w-0 opacity-0 pointer-events-none"
            )}
            aria-hidden={!sidebarOpen}
          >
            <Sidebar keepVisible={keepSidebarVisible} onKeepVisibleChange={setKeepSidebarVisible} />
          </aside>

          <section className="w-full">
            <div className="mb-4 flex">
              <button
                ref={toggleButtonRef}
                type="button"
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#c8d3e3] bg-white text-[#203a64] transition hover:bg-[#eef3fb]"
                aria-label={sidebarOpen ? "Ocultar panel lateral" : "Mostrar panel lateral"}
                aria-expanded={sidebarOpen}
              >
                {sidebarOpen ? (
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M5 5l10 10M15 5 5 15" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            </div>

            <nav className="mt-4 flex flex-wrap gap-2">
              {topNavItems.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href.replace("/demo", ""));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-full border px-5 py-1.5 text-sm font-semibold tracking-[-0.01em] transition",
                      active
                        ? "border-[#1f5db8] bg-[#e8f0ff] text-[#1f5db8]"
                        : "border-[#c8d3e3] text-[#4b5f80] hover:bg-[#eef3fb]"
                    )}
                  >
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4">{children}</div>
          </section>
        </div>
      </div>
    </main>
  );
}
