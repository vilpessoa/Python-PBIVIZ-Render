import { Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/cn';

interface IAChatButtonProps {
  open: boolean;
  onToggle: () => void;
}

/** Botão IA com gradiente cyan-blue-purple elegante — usado para abrir assistente IA */
export function IAChatButton({ open, onToggle }: IAChatButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Assistente IA"
          aria-pressed={open}
          onClick={onToggle}
          className={cn(
            'relative flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300',
            'bg-gradient-ia-chat border border-white/10',
            'shadow-glow hover:shadow-[0_6px_30px_-6px_hsl(192_100%_50%_/_0.4)]',
            'active:scale-95 active:duration-100',
            'outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70',
            open && 'ring-1 ring-white/20',
          )}
        >
          <Sparkles className="h-4 w-4 text-white" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="px-2 py-1 text-xs">
        Assistente IA
      </TooltipContent>
    </Tooltip>
  );
}
