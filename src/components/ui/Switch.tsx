import * as RSw from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch(p: React.ComponentProps<typeof RSw.Root>) {
  return (
    <RSw.Root
      {...p}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-border bg-bg transition-colors data-[state=checked]:bg-accent",
        p.className,
      )}
    >
      <RSw.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px]" />
    </RSw.Root>
  );
}
