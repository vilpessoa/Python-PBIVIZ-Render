import { cn } from "@/lib/utils";

export function StatusBar({
  pyStatus,
  buildMs,
  errorCount,
  guid,
  cursorLine,
  cursorCol,
}: {
  pyStatus: string;
  buildMs?: number;
  errorCount: number;
  guid?: string;
  cursorLine?: number;
  cursorCol?: number;
}) {
  return (
    <div className="flex h-6 items-center gap-3 border-t border-border bg-panel px-3 text-[11px] text-muted font-mono">
      <span className={cn(pyStatus === "ok" && "text-emerald-500", pyStatus === "error" && "text-rose-500")}>
        Pyodide: {pyStatus}
      </span>
      {buildMs !== undefined && <span>build {buildMs.toFixed(0)}ms</span>}
      <span className={errorCount ? "text-rose-500" : ""}>errors: {errorCount}</span>
      {guid && <span title="GUID detectado">guid: {guid}</span>}
      <span className="ml-auto">
        {cursorLine !== undefined ? `L${cursorLine}:C${cursorCol}` : ""}
      </span>
    </div>
  );
}
