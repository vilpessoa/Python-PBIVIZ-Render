import * as React from "react";
import * as RD from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = RD.Root;
export const DialogTrigger = RD.Trigger;
export const DialogClose = RD.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
}: {
  className?: string;
  children: React.ReactNode;
  title?: string;
  description?: string;
}) {
  return (
    <RD.Portal>
      <RD.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
      <RD.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-panel p-5 text-fg shadow-xl",
          className,
        )}
      >
        {title && <RD.Title className="text-base font-semibold mb-1">{title}</RD.Title>}
        {description && (
          <RD.Description className="text-xs text-muted mb-4">{description}</RD.Description>
        )}
        {children}
        <RD.Close className="absolute right-3 top-3 rounded p-1 text-muted hover:bg-bg">
          <X className="h-4 w-4" />
        </RD.Close>
      </RD.Content>
    </RD.Portal>
  );
}
