import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition";
  const styles = {
    primary: "bg-brand-500 text-white hover:bg-brand-400",
    ghost: "text-[var(--text)] hover:bg-brand-400/15",
    outline: "border border-[var(--line)] text-[var(--text)] hover:bg-brand-400/15"
  };
  return <button className={cn(base, styles[variant], className)} {...props} />;
}