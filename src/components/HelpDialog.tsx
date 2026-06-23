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

        {/* Rodapé: Sobre + Desenvolvido por */}
        <div className="mt-6 border-t border-border pt-6 space-y-4">
          <p className="text-xs text-muted-foreground">
            Converte código Python em componentes HTML estilizados, prontos para relatórios Power BI e dashboards analíticos.
          </p>

          {/* Card: Desenvolvido por */}
          <a
            href="https://www.linkedin.com/in/vilcimarpessoa/"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center gap-5 rounded-3xl border border-border/50 bg-gradient-to-br from-surface to-surface/80 px-6 py-5 shadow-[var(--shadow-card)] transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 overflow-hidden block"
          >
            {/* Brilho de fundo sutil no hover */}
            <span className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Foto com anel gradiente azul premium - maior */}
            <div className="relative shrink-0 z-10">
              <div className="rounded-full p-[2px] bg-gradient-to-br from-blue-400 via-primary to-blue-600">
                <img
                  src="https://media.licdn.com/dms/image/v2/D4D03AQEAjBi8a2KfAg/profile-displayphoto-shrink_800_800/B4DZa0r8E7HEAc-/0/1746788140558?e=1781740800&v=beta&t=HgIlwY5a9JbPWNkGWyxzgK11WuJysCIWW9p631nyDdU"
                  alt="Vil Pessoa"
                  className="h-16 w-16 rounded-full object-cover block"
                />
              </div>
              {/* Badge LinkedIn azul oficial - maior */}
              <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-lg bg-[#0A66C2] shadow-md border border-background">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-white">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </span>
            </div>

            {/* Texto com melhor espaçamento */}
            <div className="min-w-0 z-10 flex-1">
              <p className="text-[8px] font-bold uppercase tracking-widest text-primary/60 leading-none mb-1">
                Desenvolvido por
              </p>
              <p className="text-base font-bold text-foreground leading-tight group-hover:text-primary transition-colors duration-200">
                Vil Pessoa
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                Suporte · Dúvidas · Melhorias
              </p>
            </div>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}