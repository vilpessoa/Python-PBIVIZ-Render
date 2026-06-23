import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { BookOpen, Keyboard, Zap } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-4">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
    </div>
  );
}

function Shortcut({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {keys.map((k, i) => (
          <kbd
            key={i}
            className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground"
          >
            {k}
          </kbd>
        ))}
      </div>
    </div>
  );
}

export function HelpDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full mx-auto">
        <DialogHeader>
          <DialogTitle>Guia</DialogTitle>
          <DialogDescription>Referência rápida do Python Renderer</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-8 pt-2">
          {/* Coluna 1: Como usar */}
          <div>
            <SectionTitle icon={BookOpen} title="Como usar" />
            <ol className="space-y-2.5 pl-4 text-sm text-muted-foreground list-decimal">
              <li>Escreva código Python no editor</li>
              <li>
                Ative <span className="font-medium text-foreground">Live</span> para render automático, ou pressione{' '}
                <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">Ctrl+↵</kbd>
              </li>
              <li>O HTML gerado aparece no preview à direita</li>
              <li>
                Use <span className="font-medium text-foreground">Copiar HTML</span> para exportar
              </li>
              <li>
                Salve versões com <span className="font-medium text-foreground">Rascunhos</span>
              </li>
            </ol>
          </div>

          {/* Coluna 2: Atalhos */}
          <div>
            <SectionTitle icon={Keyboard} title="Atalhos de teclado" />
            <div className="space-y-0 rounded-md border border-border bg-muted/40 px-3 py-2.5">
              <Shortcut keys={['Ctrl', '↵']} label="Renderizar" />
              <Shortcut keys={['Ctrl', 'S']} label="Salvar rascunho" />
              <Shortcut keys={['Ctrl', 'L']} label="Limpar editor" />
              <Shortcut keys={['Ctrl', 'F']} label="Pesquisar" />
              <Shortcut keys={['Ctrl', '+']} label="Aumentar fonte" />
              <Shortcut keys={['Ctrl', '-']} label="Diminuir fonte" />
              <Shortcut keys={['Ctrl', '0']} label="Restaurar fonte" />
            </div>
          </div>

          {/* Coluna 3: Recursos */}
          <div>
            <SectionTitle icon={Zap} title="Recursos" />
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Temas do editor</span>
                <p className="text-xs mt-0.5">Python · Soft · Soft Dark · One Pro · Dracula · Nord · Monokai · Tokyo · GitHub · Gruvbox · Ayu</p>
              </li>
              <li>
                <span className="font-medium text-foreground">Viewport do preview</span>
                <p className="text-xs mt-0.5">Mobile · Tablet · Desktop · Fit</p>
              </li>
              <li>
                <span className="font-medium text-foreground">Edições visuais</span>
                <p className="text-xs mt-0.5">Destaque interativo entre editor e preview</p>
              </li>
              <li>
                <span className="font-medium text-foreground">Pesquisa e substituição</span>
                <p className="text-xs mt-0.5">Busca incremental no editor</p>
              </li>
            </ul>
          </div>
        </div>

        {/* Rodapé: Sobre + Desenvolvido por */}
        <div className="mt-6 border-t border-border pt-4 flex flex-col sm:flex-row items-center gap-4">
          <p className="text-xs text-muted-foreground text-center sm:text-left flex-1">
            Python Renderer converte código Python em componentes HTML estilizados prontos para relatórios Power BI e dashboards analíticos.
          </p>

          {/* Card: Desenvolvido por */}
          <a
            href="https://www.linkedin.com/in/vilcimarpessoa/"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center gap-3.5 rounded-2xl border border-border bg-surface px-4 py-3 shadow-[var(--shadow-card)] transition-all duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-glow)] shrink-0 overflow-hidden"
          >
            {/* Brilho de fundo sutil no hover */}
            <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Foto com anel gradiente azul premium */}
            <div className="relative shrink-0 z-10">
              <div className="rounded-full p-[1.5px] bg-gradient-to-r from-blue-400 via-primary to-blue-600 opacity-80">
                <img
                  src="https://media.licdn.com/dms/image/v2/D4D03AQEAjBi8a2KfAg/profile-displayphoto-shrink_800_800/B4DZa0r8E7HEAc-/0/1746788140558?e=1781740800&v=beta&t=HgIlwY5a9JbPWNkGWyxzgK11WuJysCIWW9p631nyDdU"
                  alt="Vil Pessoa"
                  className="h-11 w-11 rounded-full object-cover block"
                />
              </div>
              {/* Badge LinkedIn azul oficial */}
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-md bg-[#0A66C2] shadow-sm">
                <svg viewBox="0 0 24 24" className="h-3 w-3 fill-white">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </span>
            </div>

            {/* Texto */}
            <div className="min-w-0 z-10">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-primary/70 leading-none mb-0.5">
                Desenvolvido por
              </p>
              <p className="text-sm font-semibold text-foreground leading-tight group-hover:text-primary transition-colors duration-200">
                Vil Pessoa
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                Suporte · Dúvidas · Melhorias
              </p>
            </div>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}