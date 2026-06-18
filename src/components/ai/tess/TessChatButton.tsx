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
        <div
          className={cn(
            'inline-flex items-center justify-center rounded-full p-[1.5px] transition-all duration-300',
            open
              ? 'bg-gradient-to-r from-primary/80 via-primary/40 to-primary/80 shadow-[0_0_10px_hsl(var(--primary)/0.25)]'
              : 'bg-border/50 hover:bg-gradient-to-r hover:from-primary/50 hover:via-primary/20 hover:to-primary/50 hover:shadow-[0_0_8px_hsl(var(--primary)/0.15)]',
          )}
        >
          <button
            type="button"
            aria-label="Assistente TESS"
            aria-pressed={open}
            onClick={onToggle}
            className={cn(
              'relative flex h-7 w-7 items-center justify-center rounded-full bg-background transition-all duration-200',
              'active:scale-90 active:duration-100',
              open && 'bg-primary/5',
            )}
          >
            <TessLogo className="h-4 w-4" />
          </button>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="px-2 py-1 text-xs">
        Assistente TESS
      </TooltipContent>
    </Tooltip>
  );
}
