import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wand2 } from 'lucide-react';
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

const iconShimmer: object = {
  initial: { '--x': '100%' },
  animate: { '--x': '-100%' },
  transition: {
    repeat: Infinity,
    repeatType: 'loop',
    repeatDelay: 2,
    type: 'spring',
    stiffness: 20,
    damping: 15,
    mass: 2,
  },
};

interface IAChatButtonProps {
  open: boolean;
  onToggle: () => void;
}

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
          {/* Border gradient container */}
          <div
            className={cn(
              'absolute inset-0 rounded-full overflow-hidden',
              'bg-slate-100 dark:bg-slate-800',
              'transition duration-500',
              open ? 'bg-black/50 dark:bg-white/20' : 'hover:bg-black/40 dark:hover:bg-white/10',
            )}
          >
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ filter: 'blur(2px)' }}
              initial={{ background: movingMap[direction] }}
              animate={{
                background: hovered || open
                  ? [movingMap[direction], highlight]
                  : movingMap[direction],
              }}
              transition={{ ease: 'linear', duration: 1 }}
            />

            {open && (
              <div
                className={cn(
                  'pointer-events-none absolute -inset-px rounded-full',
                  'border-2 border-transparent',
                  '[mask-clip:padding-box,border-box]',
                  '[mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]',
                )}
              >
                <motion.div
                  className="absolute aspect-square bg-gradient-to-r from-transparent via-[hsl(var(--primary))] to-[hsl(var(--primary))]"
                  animate={{ offsetDistance: ['0%', '100%'] }}
                  style={{ width: 16, offsetPath: 'rect(0 auto auto 0 round 16px)' }}
                  transition={{ repeat: Number.POSITIVE_INFINITY, duration: 3, ease: 'linear' }}
                />
              </div>
            )}
          </div>

          {/* Inner surface */}
          <div className="absolute inset-[1.5px] rounded-full bg-background z-[1]" />

          {/* Shimmer + gradient icon */}
          <motion.div {...iconShimmer} className="relative z-10 flex items-center justify-center">
            <div
              style={{
                maskImage: 'linear-gradient(-75deg, #fff calc(var(--x) + 20%), transparent calc(var(--x) + 30%), #fff calc(var(--x) + 100%))',
                WebkitMaskImage: 'linear-gradient(-75deg, #fff calc(var(--x) + 20%), transparent calc(var(--x) + 30%), #fff calc(var(--x) + 100%))',
                background: 'linear-gradient(135deg, hsl(192, 100%, 50%) 0%, hsl(230, 90%, 60%) 50%, hsl(280, 80%, 60%) 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              } as React.CSSProperties}
            >
              <Wand2 className="w-4 h-4" strokeWidth={2.5} />
            </div>
          </motion.div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="px-2 py-1 text-xs">
        Assistente IA
      </TooltipContent>
    </Tooltip>
  );
}
