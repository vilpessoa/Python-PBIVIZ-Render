import * as RD from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const DropdownMenu = RD.Root;
export const DropdownMenuTrigger = RD.Trigger;

export function DropdownMenuContent(p: React.ComponentProps<typeof RD.Content>) {
  return (
    <RD.Portal>
      <RD.Content
        sideOffset={4}
        align="end"
        {...p}
        className={cn(
          "z-50 min-w-[180px] rounded-md border border-border bg-panel p-1 text-sm shadow-lg",
          p.className,
        )}
      />
    </RD.Portal>
  );
}

export function DropdownMenuItem(p: React.ComponentProps<typeof RD.Item>) {
  return (
    <RD.Item
      {...p}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-fg outline-none data-[highlighted]:bg-bg",
        p.className,
      )}
    />
  );
}

export const DropdownMenuSeparator = (p: React.ComponentProps<typeof RD.Separator>) => (
  <RD.Separator {...p} className={cn("my-1 h-px bg-border", p.className)} />
);
