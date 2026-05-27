/// <reference lib="webworker" />
const _self: any = self as any;

const PYODIDE_VERSION = "0.26.4";
const CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let ready: Promise<any> | null = null;

function init() {
  if (ready) return ready;
  ready = (async () => {
    (_self as any).importScripts(CDN + "pyodide.js");
    const py = await _self.loadPyodide({ indexURL: CDN });
    _self.pyodide = py;
    return py;
  })();
  return ready;
}

type Msg =
  | { id: number; type: "load" }
  | { id: number; type: "run"; source: string };

_self.onmessage = async (e: MessageEvent<Msg>) => {
  const { id, type } = e.data;
  try {
    if (type === "load") {
      await init();
      _self.postMessage({ id, ok: true, data: { version: PYODIDE_VERSION } });
      return;
    }
    if (type === "run") {
      const py = await init();
      const t0 = performance.now();
      let stdout = "";
      let stderr = "";
      py.setStdout({ batched: (s: string) => (stdout += s + "\n") });
      py.setStderr({ batched: (s: string) => (stderr += s + "\n") });

      // Provide a no-op main() and avoid file writes
      const wrapped = `
import builtins as __b
__b.__name__ = "__pbiviz_render__"
` + e.data.source + `
`;
      await py.runPythonAsync(wrapped);

      const g = py.globals;
      const css = (g.get("CSS") ?? "").toString();
      const js = (g.get("JS") ?? "").toString();
      const guid = (g.get("GUID") ?? "").toString();
      const capsPy = g.get("CAPABILITIES");
      const capabilities = capsPy
        ? capsPy.toJs({ dict_converter: Object.fromEntries })
        : null;
      try { capsPy?.destroy?.(); } catch {}

      const dt = performance.now() - t0;
      _self.postMessage({
        id,
        ok: true,
        data: { css, js, guid, capabilities, stdout, stderr, durationMs: dt },
      });
      return;
    }
  } catch (err: any) {
    _self.postMessage({ id, ok: false, error: String(err?.message ?? err) });
  }
};
