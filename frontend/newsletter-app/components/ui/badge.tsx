import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "success" | "warning" | "neutral";
};

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  const styles = {
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    neutral: "bg-[#e8f0ff] text-[#1f5db8]"
  };
  return <span className={cn("rounded-full px-2 py-1 text-xs font-semibold", styles[variant], className)} {...props} />;
}
