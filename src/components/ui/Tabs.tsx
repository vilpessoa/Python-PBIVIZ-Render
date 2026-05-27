import * as RT from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = RT.Root;

export function TabsList(p: React.ComponentProps<typeof RT.List>) {
  return (
    <RT.List
      {...p}
      className={cn("flex gap-1 border-b border-border bg-panel px-2", p.className)}
    />
  );
}

export function TabsTrigger(p: React.ComponentProps<typeof RT.Trigger>) {
  return (
    <RT.Trigger
      {...p}
      className={cn(
        "px-3 py-1.5 text-xs font-medium text-muted border-b-2 border-transparent data-[state=active]:text-fg data-[state=active]:border-accent",
        p.className,
      )}
    />
  );
}

export function TabsContent(p: React.ComponentProps<typeof RT.Content>) {
  return <RT.Content {...p} className={cn("p-3 outline-none", p.className)} />;
}
