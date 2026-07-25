import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition";
  const styles = {
    primary: "bg-[#1f5db8] text-white hover:bg-[#1b4f9d]",
    ghost: "text-[#203a64] hover:bg-[#eef3fb]",
    outline: "border border-[#c8d3e3] text-[#203a64] hover:bg-[#eef3fb]"
  };
  return <button className={cn(base, styles[variant], className)} {...props} />;
}
