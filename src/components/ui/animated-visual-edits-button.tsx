import { motion } from 'framer-motion';
import { MousePointerClick } from 'lucide-react';
import { cn } from '@/lib/cn';

interface AnimatedVisualEditsButtonProps {
  enabled: boolean;
  onClick: () => void;
}

export function AnimatedVisualEditsButton({ enabled, onClick }: AnimatedVisualEditsButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={enabled}
      title={undefined}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'relative inline-flex h-7 items-center gap-1.5 overflow-hidden rounded-full border px-3 text-[11px] font-medium transition-colors duration-200',
        enabled
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border/60 bg-transparent text-muted-foreground hover:text-foreground hover:border-primary/30',
      )}
    >
      {enabled && (
        <motion.span
          className="pointer-events-none absolute inset-0 bg-primary/5"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      <motion.span
        animate={{ rotate: enabled ? [0, -10, 10, 0] : 0 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
      >
        <MousePointerClick className="h-3.5 w-3.5" />
      </motion.span>
      <span>Visual Edits</span>
    </motion.button>
  );
}
