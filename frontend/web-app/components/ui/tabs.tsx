import * as React from "react";
import { cn } from "@/lib/utils";

export function Tabs({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex gap-2", className)} {...props} />;
}

export function Tab({ className, active, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={cn(
        "rounded-full px-4 py-1 text-xs font-semibold transition",
        active ? "bg-brand-500/20 text-cyanAccent" : "text-slate-300 hover:bg-brand-400/10",
        className
      )}
      {...props}
    />
  );
}