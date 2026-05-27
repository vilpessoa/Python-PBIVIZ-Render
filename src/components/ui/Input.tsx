import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-8 w-full rounded-md border border-border bg-panel px-2 text-sm text-fg outline-none focus:ring-1 focus:ring-accent placeholder:text-muted",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-md border border-border bg-panel px-2 py-1 text-sm text-fg outline-none focus:ring-1 focus:ring-accent placeholder:text-muted",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
