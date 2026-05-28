import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BookOpen, Keyboard, Zap } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function KbdRow({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <kbd className="kbd">{keys}</kbd>
    </div>
  );
}

export function HelpDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base">Ajuda — Python Render</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 py-2">
          {/* Como usar */}
          <section>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <BookOpen className="h-4 w-4 text-primary" />
              Como usar
            </div>
            <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside">
              <li>Escreva código Python no editor à esquerda</li>
              <li>Ative o <strong className="text-foreground">Modo Live</strong> para renderização automática</li>
              <li>O resultado HTML aparece no painel à direita</li>
              <li>Copie o HTML gerado com <kbd className="kbd">Ctrl+C</kbd></li>
              <li>Salve rascunhos com <kbd className="kbd">Ctrl+S</kbd></li>
            </ol>
          </section>

          {/* Atalhos */}
          <section>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Keyboard className="h-4 w-4 text-primary" />
              Atalhos
            </div>
            <div className="divide-y divide-border">
              <KbdRow keys="Ctrl+Enter" label="Renderizar" />
              <KbdRow keys="Ctrl+S" label="Salvar rascunho" />
              <KbdRow keys="Ctrl+L" label="Limpar editor" />
              <KbdRow keys="Ctrl+F" label="Buscar / Substituir" />
              <KbdRow keys="Ctrl+=" label="Aumentar fonte" />
              <KbdRow keys="Ctrl+−" label="Diminuir fonte" />
              <KbdRow keys="Ctrl+0" label="Tamanho padrão" />
            </div>
          </section>

          {/* Recursos */}
          <section>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Zap className="h-4 w-4 text-primary" />
              Recursos
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <strong className="text-foreground">Temas do editor:</strong>{' '}
                11 opções — Python, Soft, Soft Dark, One Pro, Dracula, Nord, Monokai, Tokyo, GitHub, Gruvbox, Ayu (todos com light/dark automático)
              </li>
              <li>
                <strong className="text-foreground">Viewport:</strong>{' '}
                Mobile (390px), Tablet (768px), Desktop (1280px), Fit
              </li>
              <li>
                <strong className="text-foreground">Visual Edits:</strong>{' '}
                Clique em elementos do preview para ir ao trecho do código
              </li>
              <li>
                <strong className="text-foreground">Busca & Substituição:</strong>{' '}
                Com suporte a regex e sensibilidade a maiúsculas
              </li>
            </ul>
          </section>
        </div>

        <p className="text-[11px] text-muted-foreground/70 border-t border-border pt-3">
          Converte código Python em componentes HTML estilizados, prontos para relatórios e dashboards analíticos.
        </p>
      </DialogContent>
    </Dialog>
  );
}
