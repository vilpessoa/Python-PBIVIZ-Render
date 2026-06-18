import { cn } from '@/lib/cn';

/**
 * Logo oficial da Tess (ícone/marca) em moldura circular.
 * Fonte: public/tess-ai-icon-filled-256.png (quadrado preto + marca branca).
 * O tamanho vem pela `className` (ex.: `h-7 w-7`); `rounded-full` recorta em círculo.
 * Usada no header do chat, nos avatares dos balões e na bolha flutuante (FAB).
 */
export function TessLogo({ className }: { className?: string }) {
  return (
    <img
      src="/tess-ai-icon-filled-256.png"
      alt="Tess"
      draggable={false}
      className={cn('shrink-0 select-none rounded-full object-cover', className)}
    />
  );
}

/**
 * Wordmark oficial "tess" (marca + texto). Fonte: public/tess-light.svg (preto).
 * `dark:invert` deixa o vetor branco no tema escuro. Usada na tela de boas-vindas.
 */
export function TessWordmark({ className }: { className?: string }) {
  return (
    <img
      src="/tess-light.svg"
      alt="tess"
      draggable={false}
      className={cn('w-auto select-none dark:invert', className)}
    />
  );
}
