import { useCallback, useEffect, useRef } from 'react';

interface UseAutoResizeTextareaProps {
  /** Altura mínima (px) que o textarea sempre mantém. */
  minHeight: number;
  /** Altura máxima (px); acima disso ativa o scroll interno. */
  maxHeight?: number;
}

/**
 * Hook que ajusta a altura do textarea ao conteúdo (auto-resize), respeitando
 * limites mínimo/máximo. Retorna a ref para anexar ao textarea e a função
 * `adjustHeight` para recalcular (passe `true` para resetar à altura mínima).
 */
export function useAutoResizeTextarea({ minHeight, maxHeight }: UseAutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      // Zera para medir o scrollHeight real e então aplica dentro dos limites.
      textarea.style.height = `${minHeight}px`;
      const next = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY));
      textarea.style.height = `${next}px`;
    },
    [minHeight, maxHeight],
  );

  // Aplica a altura mínima na montagem.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) textarea.style.height = `${minHeight}px`;
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}
