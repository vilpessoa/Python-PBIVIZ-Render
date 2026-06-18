/**
 * Liga/desliga a UI do Assistente TESS num único ponto.
 * Para desativar sem remover código: VITE_TESS_ENABLED=false.
 * Para remoção definitiva, ver api/_tess/REMOCAO.md.
 */
export const TESS_ENABLED =
  (import.meta.env.VITE_TESS_ENABLED ?? 'true') !== 'false';
