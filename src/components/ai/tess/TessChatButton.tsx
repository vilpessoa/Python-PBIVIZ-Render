import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  open: boolean;
  onToggle: () => void;
}

/** Botão da toolbar que abre/fecha o chat do Assistente TESS. */
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
            'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
            open
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <Sparkles className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent>Assistente TESS</TooltipContent>
    </Tooltip>
  );
}
