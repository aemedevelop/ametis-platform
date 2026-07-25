import type { ReactNode } from "react";
import { TopBar } from "@/components/top-bar";

type ToolShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function ToolShell({ title, subtitle, children }: ToolShellProps) {
  return (
    <main className="p-4 lg:p-6">
      <TopBar />
      <section className="mx-auto max-w-[1400px]">
        <header className="panel rounded-2xl px-5 py-5 shadow-panel">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-slate-300">{subtitle}</p>
        </header>
        <div className="mt-4">{children}</div>
      </section>
    </main>
  );
}
