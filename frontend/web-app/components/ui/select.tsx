import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-lg border border-slate-500/30 bg-slate-950/40 px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-brand-300",
        className
      )}
      {...props}
    />
  );
}