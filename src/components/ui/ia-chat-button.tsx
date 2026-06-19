import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/cn';

type Direction = 'TOP' | 'LEFT' | 'BOTTOM' | 'RIGHT';

const movingMap: Record<Direction, string> = {
  TOP: 'radial-gradient(20.7% 50% at 50% 0%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)',
  LEFT: 'radial-gradient(16.6% 43.1% at 0% 50%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)',
  BOTTOM: 'radial-gradient(20.7% 50% at 50% 100%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)',
  RIGHT: 'radial-gradient(16.2% 41.2% at 100% 50%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)',
};

const highlight =
  'radial-gradient(75% 181.2% at 50% 50%, #3275F8 0%, rgba(255, 255, 255, 0) 100%)';

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
            'group relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none p-px outline-offset-2',
            'bg-slate-100 dark:bg-slate-800',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70',
            'active:scale-95 transition-all active:duration-100',
          )}
        >
          {/* Gradient border (cyan→purple) */}
          <span className="absolute inset-0 overflow-hidden rounded-full">
            <span
              className={cn(
                'absolute inset-0 rounded-full transition-opacity duration-500',
                'bg-[radial-gradient(75%_100%_at_50%_0%,rgba(189,56,222,1)_0%,rgba(56,189,248,1)_75%)]',
                'dark:bg-[radial-gradient(75%_100%_at_50%_0%,rgba(189,56,222,0.8)_0%,rgba(56,189,248,0.4)_75%)]',
                open
                  ? 'opacity-80 dark:opacity-60'
                  : 'opacity-40 group-hover:opacity-100 dark:opacity-20 dark:group-hover:opacity-70',
              )}
            />
          </span>

          {/* Animated border highlight */}
          <motion.div
            className="absolute inset-0 z-0 overflow-hidden rounded-full"
            style={{ filter: 'blur(2px)' }}
            initial={{ background: movingMap[direction] }}
            animate={{
              background: hovered
                ? [movingMap[direction], highlight]
                : movingMap[direction],
            }}
            transition={{ ease: 'linear', duration: 1 }}
          />

          {/* Inner surface */}
          <div className="absolute inset-[1.5px] z-[1] rounded-full bg-background" />

          {/* Icon */}
          <Sparkles className="relative z-10 h-3.5 w-3.5 text-[hsl(192,100%,40%)] dark:text-[hsl(192,100%,55%)]" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="px-2 py-1 text-xs">
        Assistente IA
      </TooltipContent>
    </Tooltip>
  );
}
