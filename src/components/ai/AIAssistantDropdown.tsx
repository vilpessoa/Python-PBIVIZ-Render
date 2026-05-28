import { useState } from 'react';
import { Loader2, Sparkles, Wand2, AlignLeft, MessageSquare, Bug } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { runAiAction } from '@/services/geminiService';

type Action = 'refactor' | 'indent' | 'comment' | 'fix';

interface Props {
  code: string;
  onApply: (code: string) => void;
}

const ACTIONS: { id: Action; label: string; description: string; icon: React.ElementType }[] = [
  {
    id: 'refactor',
    label: 'Refatorar & Otimizar',
    description: 'Melhora estrutura e legibilidade',
    icon: Wand2,
  },
  {
    id: 'indent',
    label: 'Indentar Código',
    description: 'Corrige indentação e espaçamento',
    icon: AlignLeft,
  },
  {
    id: 'comment',
    label: 'Adicionar Comentários',
    description: 'Documenta o código com comentários Python',
    icon: MessageSquare,
  },
  {
    id: 'fix',
    label: 'Corrigir Erros',
    description: 'Tenta identificar e corrigir problemas',
    icon: Bug,
  },
];

export function AIAssistantDropdown({ code, onApply }: Props) {
  const [loading, setLoading] = useState<Action | null>(null);

  async function handleAction(action: Action) {
    if (loading) return;
    if (!code.trim()) {
      toast.error('Editor está vazio', { position: 'top-center' });
      return;
    }
    setLoading(action);
    try {
      const result = await runAiAction({ action, code });
      onApply(result);
      toast.success('Código atualizado pelo assistente IA', { position: 'top-right' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/quota|rate|429/i.test(msg)) {
        toast.error('Limite de requisições atingido', {
          description: 'Aguarde alguns segundos antes de tentar novamente.',
          position: 'top-center',
        });
      } else if (/auth|api.key|403/i.test(msg)) {
        toast.error('Erro de autenticação', {
          description: 'Verifique sua VITE_GEMINI_API_KEY.',
          position: 'top-center',
        });
      } else {
        toast.error('Erro ao processar com IA', { description: msg, position: 'top-center' });
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <TooltipProvider delayDuration={500}>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Assistente IA"
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Assistente IA (Gemini)</TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Assistente IA
          </div>
          <DropdownMenuSeparator />
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            const isLoading = loading === action.id;
            return (
              <DropdownMenuItem
                key={action.id}
                disabled={!!loading}
                onSelect={() => handleAction(action.id)}
                className="flex items-start gap-2 py-2"
              >
                <span className="mt-0.5 shrink-0">
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  ) : (
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium">{action.label}</div>
                  <div className="text-[10px] text-muted-foreground">{action.description}</div>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
