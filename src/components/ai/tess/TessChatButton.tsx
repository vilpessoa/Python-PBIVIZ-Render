import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  open: boolean;
  onToggle: () => void;
}

export function TessChatButton({ open, onToggle }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Assistente TESS"
          aria-pressed={open}
          onClick={onToggle}
          className={cn(
            'relative inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold tracking-wide uppercase transition-all duration-300',
            'border border-transparent',
            'before:absolute before:inset-0 before:rounded-full before:p-px',
            'before:bg-[linear-gradient(135deg,hsl(var(--primary)/0.4),hsl(var(--primary)/0.1),hsl(var(--primary)/0.4))]',
            'before:bg-[length:200%_200%] before:animate-[shimmer_3s_ease-in-out_infinite]',
            'before:-z-10 before:motion-reduce:animate-none',
            open
              ? 'bg-primary/10 text-primary shadow-[0_0_8px_hsl(var(--primary)/0.15)]'
              : 'bg-background text-muted-foreground hover:text-foreground hover:shadow-[0_0_6px_hsl(var(--primary)/0.1)]',
            'active:scale-[0.97] active:duration-100',
          )}
        >
          <Sparkles className="h-3 w-3" />
          <span>AI</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="px-2 py-1 text-xs">
        Assistente TESS
      </TooltipContent>
    </Tooltip>
  );
}
