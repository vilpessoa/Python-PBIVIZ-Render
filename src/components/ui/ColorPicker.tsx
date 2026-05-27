import * as RP from "@radix-ui/react-popover";
import { HexColorPicker } from "react-colorful";
import { cn } from "@/lib/utils";

export function ColorPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <RP.Root>
      <RP.Trigger asChild>
        <button
          className={cn(
            "inline-flex h-8 w-full items-center gap-2 rounded-md border border-border bg-panel px-2 text-xs text-fg",
            className,
          )}
        >
          <span
            className="h-4 w-4 rounded border border-border"
            style={{ background: value }}
          />
          <span className="font-mono">{value}</span>
        </button>
      </RP.Trigger>
      <RP.Portal>
        <RP.Content sideOffset={6} className="z-50 rounded-md border border-border bg-panel p-2 shadow-lg">
          <HexColorPicker color={value} onChange={onChange} />
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-2 h-7 w-full rounded border border-border bg-bg px-2 text-xs font-mono text-fg outline-none"
          />
        </RP.Content>
      </RP.Portal>
    </RP.Root>
  );
}
