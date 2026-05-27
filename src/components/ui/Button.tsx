import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "ghost" | "outline" | "accent";
type Size = "sm" | "md" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT: Record<Variant, string> = {
  default: "bg-panel border border-border text-fg hover:bg-bg",
  ghost: "bg-transparent text-fg hover:bg-panel",
  outline: "bg-transparent border border-border text-fg hover:bg-panel",
  accent: "bg-accent text-accent-fg hover:opacity-90",
};

const SIZE: Record<Size, string> = {
  sm: "h-7 px-2 text-xs gap-1",
  md: "h-9 px-3 text-sm gap-2",
  icon: "h-8 w-8 p-0",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
