import { cn } from '@/lib/cn';
import { TessLogo } from './TessLogo';
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
            'relative flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300',
            'active:scale-90 active:duration-100',
            open
              ? 'ring-1 ring-primary/30 shadow-[0_0_6px_hsl(var(--primary)/0.12)]'
              : 'ring-1 ring-transparent hover:ring-border/40 hover:shadow-sm',
          )}
        >
          <TessLogo className="h-5 w-5 rounded-full bg-black dark:bg-neutral-900" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="px-2 py-1 text-xs">
        Assistente TESS
      </TooltipContent>
    </Tooltip>
  );
}
