import { useEffect, useRef } from 'react';

type HotkeyMap = Record<string, () => void>;

export function useHotkeys(map: HotkeyMap): void {
  const mapRef = useRef(map);
  mapRef.current = map;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt = e.altKey;
      let key = e.key.toLowerCase();
      if (key === ' ') key = 'space';
      if (key === 'enter') key = 'enter';

      const parts: string[] = [];
      if (ctrl) parts.push('ctrl');
      if (shift) parts.push('shift');
      if (alt) parts.push('alt');
      parts.push(key);
      const combo = parts.join('+');

      const handler = mapRef.current[combo];
      if (handler) {
        e.preventDefault();
        handler();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
