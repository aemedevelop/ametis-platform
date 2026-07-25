import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & { variant?: "success" | "warning" | "neutral" };

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  const styles = {
    success: "bg-emerald-500/15 text-emerald-200",
    warning: "bg-amber-500/15 text-amber-200",
    neutral: "bg-brand-500/15 text-brand-100"
  };
  return <span className={cn("rounded-full px-2 py-1 text-xs font-semibold", styles[variant], className)} {...props} />;
}