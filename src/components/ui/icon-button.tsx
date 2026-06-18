import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

interface IconButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tooltip: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
}

/** Botão de ícone redondo com tooltip — padrão aprovado do projeto */
export function IconButton({
  icon: Icon,
  label,
  tooltip,
  onClick,
  active = false,
  disabled = false,
  tooltipSide = 'bottom',
}: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={onClick}
          disabled={disabled}
          variant="outline"
          size="icon"
          className={cn(
            'h-8 w-8 rounded-full border border-border/50 active:scale-95 transition-all active:duration-100',
            active
              ? 'bg-primary/15 text-primary border-primary/40 hover:bg-primary/20'
              : 'hover:bg-accent',
          )}
          aria-label={label}
          aria-pressed={active}
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide} className="px-2 py-1 text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
