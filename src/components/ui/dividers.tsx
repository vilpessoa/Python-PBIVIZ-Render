import { cn } from '@/lib/cn';

/** Divisor vertical fino para toolbars */
export function VDivider({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'mx-0.5 inline-block h-3 w-px shrink-0 rounded-full bg-border opacity-60',
        className,
      )}
    />
  );
}

/** Divisor vertical para StatusBar (margens maiores, hidden em mobile) */
export function VDividerWide({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'mx-3 hidden h-3 w-px shrink-0 rounded-full bg-border opacity-50 md:inline-block',
        className,
      )}
    />
  );
}
