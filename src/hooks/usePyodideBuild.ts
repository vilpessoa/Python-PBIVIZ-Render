import { useEffect, useRef, useState } from "react";
import { pyodideClient, type BuildResult } from "@/lib/pyodideClient";
import { useDebounced } from "./useDebounce";

export type BuildStatus = "idle" | "loading" | "running" | "ok" | "error";

export function usePyodideBuild(source: string, debounceMs: number, autoRun: boolean) {
  const debouncedSource = useDebounced(source, debounceMs);
  const [status, setStatus] = useState<BuildStatus>("loading");
  const [result, setResult] = useState<BuildResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    setStatus("loading");
    pyodideClient.load()
      .then(() => setStatus("idle"))
      .catch((e) => { setError(String(e?.message ?? e)); setStatus("error"); });
  }, []);

  const run = async (src: string) => {
    const mine = ++seq.current;
    setStatus("running");
    try {
      const r = await pyodideClient.run(src);
      if (mine !== seq.current) return;
      setResult(r);
      setError(r.stderr || null);
      setStatus("ok");
    } catch (e: any) {
      if (mine !== seq.current) return;
      setError(String(e?.message ?? e));
      setStatus("error");
    }
  };

  useEffect(() => {
    if (!autoRun) return;
    if (!pyodideClient.isLoaded) return;
    if (!debouncedSource.trim()) return;
    void run(debouncedSource);
  }, [debouncedSource, autoRun]);

  return { status, result, error, runNow: () => run(source) };
}
