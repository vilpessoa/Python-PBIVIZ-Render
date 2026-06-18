import { motion, useReducedMotion } from 'framer-motion';
import { TessLogo } from './TessLogo';

interface Props {
  onClick: () => void;
}

/**
 * Bolha flutuante do Assistente TESS, exibida quando o chat está minimizado.
 * Fica `fixed` com z-index alto (acima de toda a app, abaixo dos toasts) e, por
 * ser um círculo pequeno, não bloqueia a interação com o resto do sistema.
 */
export function TessFab({ onClick }: Props) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label="Abrir Assistente TESS"
      title="Abrir Assistente TESS"
      initial={reduce ? false : { opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduce ? undefined : { opacity: 0, scale: 0.6 }}
      whileHover={reduce ? undefined : { scale: 1.06 }}
      whileTap={reduce ? undefined : { scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 90 }}
      className="rounded-full shadow-lg shadow-black/25 outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70"
    >
      <TessLogo className="h-12 w-12" />
    </motion.button>
  );
}
