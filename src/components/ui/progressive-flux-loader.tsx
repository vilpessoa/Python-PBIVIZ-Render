import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';

interface ProgressiveFluxLoaderProps {
  /** Rótulos rotativos exibidos acima da barra. */
  phases?: string[];
  /** Intervalo (ms) entre a troca de rótulos. */
  interval?: number;
  className?: string;
}

const DEFAULT_PHASES = ['analisando…', 'gerando código…', 'revisando…', 'quase lá…'];

// Gradiente "flux" derivado dos tokens do tema (claro/escuro).
const FLUX_GRADIENT =
  'linear-gradient(90deg, hsl(var(--primary-from)) 0%, hsl(var(--primary-to)) 50%, hsl(var(--primary-from)) 100%)';

/**
 * Barra de progresso indeterminada com rótulo PT-BR rotativo.
 * A atuação da TESS é um único `await` sem porcentagem real, então a barra é um
 * "sweep" contínuo (não determinístico). Respeita prefers-reduced-motion.
 */
export function ProgressiveFluxLoader({
  phases = DEFAULT_PHASES,
  interval = 2200,
  className,
}: ProgressiveFluxLoaderProps) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (phases.length <= 1) return;
    const id = setInterval(() => setI((n) => (n + 1) % phases.length), interval);
    return () => clearInterval(id);
  }, [phases.length, interval]);

  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      <div className="relative h-3.5 overflow-hidden text-[10px] font-medium text-muted-foreground">
        {reduce ? (
          <span>{phases[i]}</span>
        ) : (
          <AnimatePresence mode="wait">
            <motion.span
              key={phases[i]}
              className="absolute inset-0"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {phases[i]}
            </motion.span>
          </AnimatePresence>
        )}
      </div>

      <div className="relative h-1 w-full overflow-hidden rounded-full bg-primary/15">
        {reduce ? (
          <div
            className="h-full w-full animate-pulse rounded-full"
            style={{ background: FLUX_GRADIENT }}
          />
        ) : (
          <motion.div
            className="absolute inset-y-0 w-2/5 rounded-full"
            style={{ background: FLUX_GRADIENT }}
            animate={{ x: ['-110%', '260%'] }}
            transition={{ duration: 1.4, ease: 'easeInOut', repeat: Infinity }}
          />
        )}
      </div>
    </div>
  );
}

export default ProgressiveFluxLoader;
