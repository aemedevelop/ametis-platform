"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TopBar } from "../web-app/components/top-bar";
import { Sidebar } from "../web-app/components/sidebar";

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/sources", label: "Sources" },
  { href: "/projects", label: "Projects" }
];

export function ProductShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith("/auth");

  if (isAuthRoute) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <main className="p-4 lg:p-6">
      <TopBar />
      <div className="mx-auto flex max-w-[1480px] gap-4">
        <Sidebar />

        <section className="w-full">
          <header className="panel mb-4 rounded-2xl px-5 py-4 shadow-panel">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-display text-2xl font-semibold tracking-tight">Product App</p>
                <p className="text-sm text-slate-300">Standalone AMETIS product experience.</p>
              </div>
            </div>
          </header>

          <nav className="mt-4 flex flex-wrap gap-2">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full border border-transparent px-4 py-1 text-xs font-semibold transition ${
                    active
                      ? "bg-brand-500/20 text-cyanAccent"
                      : "border-[var(--line)] text-slate-300 hover:bg-brand-400/10"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4">{children}</div>
        </section>
      </div>
    </main>
  );
}
