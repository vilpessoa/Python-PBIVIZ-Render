import { useCallback, useEffect, useRef, useState } from "react";

export function SplitPane({
  left,
  right,
  ratio,
  onRatioChange,
  minRatio = 0.15,
  maxRatio = 0.85,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  ratio: number;
  onRatioChange: (r: number) => void;
  minRatio?: number;
  maxRatio?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const onMove = useCallback((e: MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const r = (e.clientX - rect.left) / rect.width;
    onRatioChange(Math.max(minRatio, Math.min(maxRatio, r)));
  }, [onRatioChange, minRatio, maxRatio]);

  useEffect(() => {
    if (!dragging) return;
    const up = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", up);
    };
  }, [dragging, onMove]);

  return (
    <div ref={ref} className="flex h-full w-full">
      <div style={{ width: `${ratio * 100}%` }} className="h-full overflow-hidden">
        {left}
      </div>
      <div
        onMouseDown={() => setDragging(true)}
        className="w-1 cursor-col-resize bg-border hover:bg-accent transition-colors"
      />
      <div style={{ width: `${(1 - ratio) * 100}%` }} className="h-full overflow-hidden">
        {right}
      </div>
    </div>
  );
}
