import * as RS from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption { value: string; label: string; }

export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  className,
}: {
  value?: string;
  onValueChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <RS.Root value={value} onValueChange={onValueChange}>
      <RS.Trigger
        className={cn(
          "inline-flex h-8 w-full items-center justify-between rounded-md border border-border bg-panel px-2 text-sm text-fg outline-none focus:ring-1 focus:ring-accent",
          className,
        )}
      >
        <RS.Value placeholder={placeholder} />
        <RS.Icon><ChevronDown className="h-3 w-3 opacity-60" /></RS.Icon>
      </RS.Trigger>
      <RS.Portal>
        <RS.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-72 overflow-hidden rounded-md border border-border bg-panel text-sm shadow-lg"
        >
          <RS.Viewport className="p-1">
            {options.map((o) => (
              <RS.Item
                key={o.value}
                value={o.value}
                className="flex cursor-pointer items-center justify-between rounded px-2 py-1 text-fg outline-none data-[highlighted]:bg-bg"
              >
                <RS.ItemText>{o.label}</RS.ItemText>
                <RS.ItemIndicator><Check className="h-3 w-3" /></RS.ItemIndicator>
              </RS.Item>
            ))}
          </RS.Viewport>
        </RS.Content>
      </RS.Portal>
    </RS.Root>
  );
}
