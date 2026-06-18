import { useEffect, useRef, type CSSProperties } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  open: boolean;
  onToggle: () => void;
}

export function TessChatButton({ open, onToggle }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (btnRef.current) {
      const el = btnRef.current;
      el.style.setProperty(
        '--path',
        `path('M 0 0 H ${el.offsetWidth} V ${el.offsetHeight} H 0 V 0')`,
      );
    }
  }, []);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          ref={btnRef}
          type="button"
          aria-label="Assistente TESS"
          aria-pressed={open}
          onClick={onToggle}
          style={
            {
              '--duration': 2.5,
              '--light-width': '80px',
              '--light-color': open ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.5)',
              '--border-width': '1px',
              isolation: 'isolate',
            } as CSSProperties
          }
          className={cn(
            'group/ai-btn relative z-[3] inline-flex h-7 items-center justify-center gap-1.5 overflow-hidden rounded-full px-3 text-[11px] font-semibold tracking-wide uppercase whitespace-nowrap',
            'transition-all duration-200 active:scale-95',
            open ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {/* Luz percorrendo a borda — visível quando ativo */}
          {open && (
            <div
              className="animate-star-btn absolute inset-0 aspect-square bg-[radial-gradient(ellipse_at_center,var(--light-color),transparent,transparent)]"
              style={
                {
                  offsetPath: 'var(--path)',
                  offsetDistance: '0%',
                  width: 'var(--light-width)',
                } as CSSProperties
              }
            />
          )}

          {/* Borda com fundo de estrelas */}
          <div
            className={cn(
              'absolute inset-0 z-[4] overflow-hidden rounded-[inherit]',
              open
                ? 'border-primary/25 dark:border-primary/30'
                : 'border-border/60 dark:border-white/10',
            )}
            style={{ borderWidth: 'var(--border-width)' }}
            aria-hidden="true"
          >
            <StarDots color={open ? 'hsl(var(--primary) / 0.12)' : 'currentColor'} />
          </div>

          <span className="relative z-10 inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            AI
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="px-2 py-1 text-xs">
        Assistente TESS
      </TooltipContent>
    </Tooltip>
  );
}

function StarDots({ color }: { color?: string }) {
  return (
    <svg
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      viewBox="0 0 100 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#ai-star-clip)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M32.34 26.68a.66.66 0 1 0-1.32 0 .66.66 0 0 0 1.32 0Zm24.42-22.72a.66.66 0 1 0-1.32 0 .66.66 0 0 0 1.32 0ZM40.26 17.16a.66.66 0 1 1 0 1.32.66.66 0 0 1 0-1.32Zm34.32-11.88a.66.66 0 1 1 0 1.32.66.66 0 0 1 0-1.32ZM22.32 34.18a.66.66 0 1 0-1.32 0 .66.66 0 0 0 1.32 0Zm-14.16-1.32a.66.66 0 1 0-1.32 0 .66.66 0 0 0 1.32 0ZM7.5 23.68a.66.66 0 1 1 0 1.32.66.66 0 0 1 0-1.32Zm11.82-5.2a.66.66 0 1 0-1.32 0 .66.66 0 0 0 1.32 0ZM5.66 11.84a.66.66 0 1 1 0 1.32.66.66 0 0 1 0-1.32ZM35.16 35.5a.66.66 0 1 0-1.32 0 .66.66 0 0 0 1.32 0ZM53.5 36.18a.66.66 0 1 1 0 1.32.66.66 0 0 1 0-1.32ZM48.5 28.66a.66.66 0 1 0-1.32 0 .66.66 0 0 0 1.32 0ZM60.34 27.34a.66.66 0 1 1 0 1.32.66.66 0 0 1 0-1.32Zm-4.056-10.84a.66.66 0 1 0-1.32 0 .66.66 0 0 0 1.32 0ZM46.2 7.26a.66.66 0 1 0-1.32 0 .66.66 0 0 0 1.32 0ZM33 9.34a.66.66 0 1 0-1.32 0 .66.66 0 0 0 1.32 0ZM16 4.856a.66.66 0 1 1 0 1.32.66.66 0 0 1 0-1.32Zm53.66 16.304a.66.66 0 1 0-1.32 0 .66.66 0 0 0 1.32 0Zm10.86-6.64a.66.66 0 1 0-1.32 0 .66.66 0 0 0 1.32 0ZM85.66 24.34a.66.66 0 1 1 0 1.32.66.66 0 0 1 0-1.32ZM91.32 10a.66.66 0 1 0-1.32 0 .66.66 0 0 0 1.32 0Z"
          fill={color || 'currentColor'}
        />
        <rect width="100" height="40" fill="none" />
      </g>
      <defs>
        <clipPath id="ai-star-clip">
          <rect width="100" height="40" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
