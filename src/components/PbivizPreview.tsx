import { useEffect, useMemo, useRef, useState } from "react";
import { buildPreviewShell } from "@/lib/iframeBridge";

export interface PbivizPreviewProps {
  css: string;
  js: string;
  guid: string;
  dataView: any;
  resetKey: number;
  onViewportChange?: (v: { width: number; height: number }) => void;
}

export function PbivizPreview({ css, js, guid, dataView, resetKey, onViewportChange }: PbivizPreviewProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  const [viewport, setViewport] = useState({ width: 360, height: 640 });
  const shell = useMemo(() => buildPreviewShell(), []);

  useEffect(() => {
    setReady(false);
  }, [resetKey, guid]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "PREVIEW_READY") setReady(true);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((es) => {
      const r = es[0].contentRect;
      const next = { width: Math.max(160, r.width), height: Math.max(120, r.height) };
      setViewport(next);
      onViewportChange?.(next);
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [onViewportChange]);

  useEffect(() => {
    if (!ready || !iframeRef.current?.contentWindow) return;
    if (!js || !guid) return;
    iframeRef.current.contentWindow.postMessage(
      { type: "RENDER", css, js, guid, dataView, viewport, reset: false },
      "*",
    );
  }, [ready, css, js, guid, dataView, viewport]);

  return (
    <div ref={wrapRef} className="relative h-full w-full bg-white overflow-hidden">
      <iframe
        key={resetKey}
        ref={iframeRef}
        srcDoc={shell}
        title="pbiviz-preview"
        sandbox="allow-scripts"
        className="h-full w-full border-0"
      />
    </div>
  );
}
