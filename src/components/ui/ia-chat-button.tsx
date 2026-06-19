import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/cn';

type Direction = 'TOP' | 'LEFT' | 'BOTTOM' | 'RIGHT';

const movingMap: Record<Direction, string> = {
  TOP: 'radial-gradient(20.7% 50% at 50% 0%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)',
  LEFT: 'radial-gradient(16.6% 43.1% at 0% 50%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)',
  BOTTOM: 'radial-gradient(20.7% 50% at 50% 100%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)',
  RIGHT: 'radial-gradient(16.2% 41.2% at 100% 50%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)',
};

const highlight = 'radial-gradient(75% 181.2% at 50% 50%, #3275F8 0%, rgba(255, 255, 255, 0) 100%)';

interface IAChatButtonProps {
  open: boolean;
  onToggle: () => void;
}

/** Botão IA com borda gradiente animada — luz rotativa em repouso, borda animada quando ativo */
export function IAChatButton({ open, onToggle }: IAChatButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [direction, setDirection] = useState<Direction>('BOTTOM');

  useEffect(() => {
    if (hovered || open) return;
    const interval = setInterval(() => {
      setDirection((prev) => {
        const dirs: Direction[] = ['TOP', 'LEFT', 'BOTTOM', 'RIGHT'];
        return dirs[(dirs.indexOf(prev) - 1 + dirs.length) % dirs.length];
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [hovered, open]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Assistente IA"
          aria-pressed={open}
          onClick={onToggle}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={cn(
            'relative h-8 w-8 flex items-center justify-center rounded-full p-px outline-offset-2',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70',
            'active:scale-95 transition-all active:duration-100',
            'overflow-visible',
          )}
        >
          {/* Container da borda gradiente */}
          <div
            className={cn(
              'absolute inset-0 rounded-full overflow-hidden',
              'bg-slate-100 dark:bg-slate-800',
              'transition duration-500',
              open ? 'bg-black/50 dark:bg-white/20' : 'hover:bg-black/40 dark:hover:bg-white/10',
            )}
          >
            {/* Gradiente de borda (luz rotativa) */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                filter: 'blur(2px)',
              }}
              initial={{ background: movingMap[direction] }}
              animate={{
                background: hovered || open
                  ? [movingMap[direction], highlight]
                  : movingMap[direction],
              }}
              transition={{ ease: 'linear', duration: 1 }}
            />

            {/* Borda animada (quando ativo) */}
            {open && (
              <div
                className={cn(
                  'pointer-events-none absolute inset-0 rounded-full',
                  '-inset-px border-2 border-transparent',
                  '[mask-clip:padding-box,border-box]',
                  '[mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]',
                )}
              >
                <motion.div
                  className="absolute aspect-square bg-gradient-to-r from-transparent via-[hsl(var(--primary))] to-[hsl(var(--primary))]"
                  animate={{
                    offsetDistance: ['0%', '100%'],
                  }}
                  style={{
                    width: 16,
                    offsetPath: `rect(0 auto auto 0 round ${16}px)`,
                  }}
                  transition={{
                    repeat: Number.POSITIVE_INFINITY,
                    duration: 3,
                    ease: 'linear',
                  }}
                />
              </div>
            )}
          </div>

          {/* Fundo interno */}
          <div className="absolute inset-[1.5px] rounded-full bg-background z-[1]" />

          {/* Ícone SVG customizado */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 512 512"
            className="relative z-10 w-4 h-4"
            fill="currentColor"
            stroke="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M259.92,262.91,216.4,149.77a9,9,0,0,0-16.8,0L156.08,262.91a9,9,0,0,1-5.17,5.17L37.77,311.6a9,9,0,0,0,0,16.8l113.14,43.52a9,9,0,0,1,5.17,5.17L199.6,490.23a9,9,0,0,0,16.8,0l43.52-113.14a9,9,0,0,1,5.17-5.17L378.23,328.4a9,9,0,0,0,0-16.8L265.09,268.08A9,9,0,0,1,259.92,262.91Z"
              fill="currentColor"
            />
            <polygon
              points="108 68 88 16 68 68 16 88 68 108 88 160 108 108 160 88 108 68"
              fill="currentColor"
            />
            <polygon
              points="426.67 117.33 400 48 373.33 117.33 304 144 373.33 170.67 400 240 426.67 170.67 496 144 426.67 117.33"
              fill="currentColor"
            />
          </svg>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="px-2 py-1 text-xs">
        Assistente IA
      </TooltipContent>
    </Tooltip>
  );
}
