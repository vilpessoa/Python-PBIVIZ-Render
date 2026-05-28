import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

export const ZOOM_MIN = 10;
export const ZOOM_MAX = 24;
export const ZOOM_DEFAULT = 13;

function clamp(v: number) {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v));
}

interface Props {
  value: number;
  onChange: (v: number) => void;
  className?: string;
}

export function ZoomControls({ value, onChange, className }: Props) {
  return (
    <div className={cn('flex items-center rounded-md border border-border overflow-hidden', className)}>
      <button
        type="button"
        aria-label="Diminuir fonte"
        disabled={value <= ZOOM_MIN}
        onClick={() => onChange(clamp(value - 1))}
        className="flex h-6 w-6 items-center justify-center bg-surface hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Minus className="h-3 w-3" />
      </button>
      <button
        type="button"
        aria-label="Restaurar tamanho padrão"
        onClick={() => onChange(ZOOM_DEFAULT)}
        className="flex h-6 min-w-[2rem] items-center justify-center bg-surface hover:bg-accent text-[11px] tabular-nums transition-colors border-x border-border"
      >
        {value}
      </button>
      <button
        type="button"
        aria-label="Aumentar fonte"
        disabled={value >= ZOOM_MAX}
        onClick={() => onChange(clamp(value + 1))}
        className="flex h-6 w-6 items-center justify-center bg-surface hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}
