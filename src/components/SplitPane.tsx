import { useCallback, useEffect, useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';

interface Props {
  left: React.ReactNode;
  right: React.ReactNode;
  initialSplit?: number;
  onSplitChange?: (split: number) => void;
}

const MIN_SPLIT = 15;
const MAX_SPLIT = 85;

export function SplitPane({ left, right, initialSplit = 50, onSplitChange }: Props) {
  const [split, setSplit] = useState(initialSplit);
  const [dragging, setDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 768);
    }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    function onMouseMove(e: MouseEvent) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(MIN_SPLIT, Math.min(MAX_SPLIT, pct));
      setSplit(clamped);
    }
    function onMouseUp() {
      setDragging(false);
      setSplit((s) => {
        onSplitChange?.(s);
        return s;
      });
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging, onSplitChange]);

  if (isMobile) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0">{left}</div>
        <div className="flex-1 min-h-0">{right}</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-1 min-h-0 min-w-0"
      style={{ userSelect: dragging ? 'none' : undefined }}
    >
      <div style={{ width: `${split}%` }} className="min-h-0 min-w-0 flex flex-col">
        {left}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={onMouseDown}
        className={`relative flex w-1.5 shrink-0 cursor-col-resize items-center justify-center bg-border transition-colors hover:bg-primary/40 ${dragging ? 'bg-primary/60' : ''}`}
      >
        <div className="absolute flex h-8 w-3.5 items-center justify-center rounded bg-border text-muted-foreground hover:bg-primary/20">
          <GripVertical className="h-3 w-3" />
        </div>
      </div>

      <div style={{ width: `${100 - split}%` }} className="min-h-0 min-w-0 flex flex-col">
        {right}
      </div>
    </div>
  );
}
