import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  open: boolean;
  onToggle: () => void;
}

/**
 * Botão da toolbar que abre/fecha o chat do Assistente TESS.
 * Pílula com borda em gradiente colorido animado (sparkles + "AI"), fundo claro,
 * tooltip padrão para baixo — alinhado ao padrão dos demais botões da toolbar.
 */
export function TessChatButton({ open, onToggle }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Assistente TESS"
          aria-pressed={open}
          onClick={onToggle}
          className="relative inline-flex h-8 items-center overflow-hidden rounded-full p-[1.5px] transition-transform active:scale-95 active:duration-100"
        >
          {/* Borda em gradiente girando */}
          <span
            aria-hidden
            className="absolute inset-[-150%] animate-[spin_4s_linear_infinite] motion-reduce:animate-none"
            style={{
              background:
                'conic-gradient(from 0deg, #22c55e, #06b6d4, #f59e0b, #ec4899, #22c55e)',
            }}
          />
          {/* Miolo claro com o conteúdo */}
          <span
            className={cn(
              'relative z-10 flex h-full items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold transition-colors',
              open ? 'bg-primary/10 text-primary' : 'bg-background text-foreground',
            )}
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
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
