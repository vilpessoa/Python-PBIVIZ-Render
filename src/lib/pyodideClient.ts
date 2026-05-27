export interface BuildResult {
  css: string;
  js: string;
  guid: string;
  capabilities: any;
  stdout: string;
  stderr: string;
  durationMs: number;
}

type Pending = { resolve: (v: any) => void; reject: (e: any) => void };

class PyodideClient {
  private worker: Worker | null = null;
  private pending = new Map<number, Pending>();
  private seq = 0;
  private loaded = false;

  private ensure() {
    if (this.worker) return;
    this.worker = new Worker(
      new URL("../workers/pyodide.worker.ts", import.meta.url),
      { type: "classic" },
    );
    this.worker.onmessage = (e: MessageEvent<any>) => {
      const { id, ok, data, error } = e.data;
      const p = this.pending.get(id);
      if (!p) return;
      this.pending.delete(id);
      if (ok) p.resolve(data);
      else p.reject(new Error(error));
    };
  }

  private call<T>(msg: any): Promise<T> {
    this.ensure();
    const id = ++this.seq;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ ...msg, id });
    });
  }

  async load(): Promise<void> {
    if (this.loaded) return;
    await this.call({ type: "load" });
    this.loaded = true;
  }

  run(source: string): Promise<BuildResult> {
    return this.call<BuildResult>({ type: "run", source });
  }

  get isLoaded() { return this.loaded; }
}

export const pyodideClient = new PyodideClient();
