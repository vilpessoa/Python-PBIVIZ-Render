import * as React from 'react';
import { cn } from '@/lib/cn';

type Variant = 'default' | 'warning' | 'destructive' | 'outline' | 'info';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants: Record<Variant, string> = {
    default: 'bg-primary/15 text-primary border border-primary/30',
    warning: 'bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))] border border-[hsl(var(--warning)/0.4)]',
    destructive: 'bg-destructive/15 text-destructive border border-destructive/40',
    outline: 'border border-border text-foreground',
    info: 'bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/40',
  };
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium', variants[variant], className)}
      {...props}
    />
  );
}
