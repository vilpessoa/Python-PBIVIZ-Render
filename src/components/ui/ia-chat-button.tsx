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
    if (hovered) return;
    const interval = setInterval(() => {
      setDirection((prev) => {
        const dirs: Direction[] = ['TOP', 'LEFT', 'BOTTOM', 'RIGHT'];
        return dirs[(dirs.indexOf(prev) - 1 + dirs.length) % dirs.length];
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [hovered]);

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
              'transition duration-500',
              open
                ? 'bg-black/60 dark:bg-white/30'
                : 'bg-slate-200/80 dark:bg-slate-700/80 hover:bg-black/40 dark:hover:bg-white/15',
            )}
          >
            {/* Rotating light on border */}
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
          </div>

          {/* Active state: soft glow ring */}
          {open && (
            <motion.div
              className="absolute -inset-[1px] rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, hsl(192 100% 50% / 0.4), hsl(230 90% 60% / 0.4), hsl(280 80% 60% / 0.4), hsl(192 100% 50% / 0.4))',
                filter: 'blur(3px)',
              }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 4, ease: 'linear' }}
            />
          )}

          {/* Inner surface */}
          <div className={cn(
            'absolute inset-[1.5px] rounded-full z-[1] transition-colors duration-300',
            'bg-background',
          )} />

          {/* Shimmer icon */}
          <motion.div {...iconShimmer} className="relative z-10 flex items-center justify-center">
            <div
              style={{
                maskImage: 'linear-gradient(-75deg, #fff calc(var(--x) + 20%), transparent calc(var(--x) + 30%), #fff calc(var(--x) + 100%))',
                WebkitMaskImage: 'linear-gradient(-75deg, #fff calc(var(--x) + 20%), transparent calc(var(--x) + 30%), #fff calc(var(--x) + 100%))',
              } as React.CSSProperties}
            >
              <Wand2
                className={cn(
                  'w-3.5 h-3.5 transition-colors duration-300',
                  open
                    ? 'text-primary'
                    : 'text-muted-foreground group-hover:text-foreground',
                )}
                strokeWidth={2}
              />
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
