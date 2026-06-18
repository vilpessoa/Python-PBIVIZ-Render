import { cn } from '@/lib/cn';

/**
 * Marca da Tess (cata-vento de 4 formas arredondadas) como SVG vetorial.
 * Usa `currentColor`, então herda a cor do contexto (branco dentro da moldura
 * preta, ou a cor do texto na wordmark). Trocável pelo SVG oficial mantendo a API.
 */
export function TessMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="currentColor" aria-hidden="true">
      <rect x="30" y="22" width="28" height="18" rx="9" />
      <rect x="30" y="22" width="28" height="18" rx="9" transform="rotate(90 50 50)" />
      <rect x="30" y="22" width="28" height="18" rx="9" transform="rotate(180 50 50)" />
      <rect x="30" y="22" width="28" height="18" rx="9" transform="rotate(270 50 50)" />
    </svg>
  );
}

/**
 * Logo da Tess em moldura circular preta com a marca branca.
 * O tamanho vem pela `className` (ex.: `h-8 w-8`); a marca interna escala junto.
 * Usada no header do chat, nos avatares dos balões e na bolha flutuante (FAB).
 */
export function TessLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-black text-white',
        className,
      )}
    >
      <TessMark className="h-[62%] w-[62%]" />
    </span>
  );
}

/**
 * Versão com wordmark "tess" (marca em círculo contornado + texto).
 * Adapta-se ao tema via `text-foreground` / `border-current`. Usada na tela de
 * boas-vindas (estado vazio do chat).
 */
export function TessWordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 text-foreground', className)}>
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-current">
        <TessMark className="h-[56%] w-[56%]" />
      </span>
      <span className="text-3xl font-semibold lowercase tracking-tight">tess</span>
    </span>
  );
}
