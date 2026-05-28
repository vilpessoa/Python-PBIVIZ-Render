import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';

interface Props {
  color: string;
  position: { x: number; y: number };
  onColorChange: (color: string) => void;
  onClose: () => void;
}

const HEX_RE = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;
const PICKER_W = 200;
const PICKER_H = 260;
const MARGIN = 8;

export function FloatingColorPicker({ color, position, onColorChange, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [hexInput, setHexInput] = useState(color);
  const [pos, setPos] = useState({ x: position.x, y: position.y });

  useLayoutEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = position.x;
    let y = position.y + 20;
    if (x + PICKER_W > vw - MARGIN) x = vw - PICKER_W - MARGIN;
    if (y + PICKER_H > vh - MARGIN) y = position.y - PICKER_H - MARGIN;
    if (x < MARGIN) x = MARGIN;
    if (y < MARGIN) y = MARGIN;
    setPos({ x, y });
  }, [position]);

  useEffect(() => {
    setHexInput(color);
  }, [color]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('mousedown', onMouseDown, true);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onMouseDown, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  function handleHexInput(v: string) {
    setHexInput(v);
    if (HEX_RE.test(v)) onColorChange(v);
  }

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999 }}
      className="rounded-xl border border-border bg-surface-elevated shadow-xl p-3 flex flex-col gap-2"
    >
      <HexColorPicker color={color} onChange={onColorChange} style={{ width: '100%' }} />
      <input
        type="text"
        value={hexInput}
        onChange={(e) => handleHexInput(e.target.value)}
        spellCheck={false}
        className="w-full rounded border border-border bg-surface px-2 py-1 text-xs font-mono outline-none focus:ring-1 focus:ring-ring"
        placeholder="#000000"
      />
    </div>
  );
}
