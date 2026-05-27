import { useMemo } from "react";
import { parseObjects, type ObjectSchema } from "@/lib/capabilitiesSchema";
import { Input } from "./ui/Input";
import { Switch } from "./ui/Switch";
import { Select } from "./ui/Select";
import { ColorPicker } from "./ui/ColorPicker";

export interface ObjectsState {
  [object: string]: { [prop: string]: any };
}

export function ObjectsSettingsPanel({
  capabilities,
  value,
  onChange,
}: {
  capabilities: any;
  value: ObjectsState;
  onChange: (next: ObjectsState) => void;
}) {
  const schema = useMemo<ObjectSchema[]>(() => parseObjects(capabilities), [capabilities]);

  if (!schema.length) {
    return <div className="p-4 text-xs text-muted">Sem objetos de configuracao no capabilities.</div>;
  }

  const set = (obj: string, prop: string, v: any) => {
    onChange({ ...value, [obj]: { ...(value[obj] ?? {}), [prop]: v } });
  };

  return (
    <div className="space-y-4 p-3">
      {schema.map((o) => (
        <details key={o.name} open className="rounded-md border border-border bg-panel">
          <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-fg">
            {o.displayName}
          </summary>
          <div className="space-y-3 border-t border-border p-3">
            {o.properties.map((p) => {
              const cur = value[o.name]?.[p.name];
              return (
                <div key={p.name} className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <label className="text-[11px] text-muted" title={p.description}>
                    {p.displayName}
                  </label>
                  <div>
                    {p.type.kind === "text" && (
                      <Input value={cur ?? ""} onChange={(e) => set(o.name, p.name, e.target.value)} />
                    )}
                    {p.type.kind === "bool" && (
                      <Switch checked={!!cur} onCheckedChange={(b) => set(o.name, p.name, b)} />
                    )}
                    {(p.type.kind === "numeric" || p.type.kind === "integer") && (
                      <Input
                        type="number"
                        value={cur ?? ""}
                        onChange={(e) =>
                          set(o.name, p.name, e.target.value === "" ? "" : Number(e.target.value))
                        }
                      />
                    )}
                    {p.type.kind === "fill" && (
                      <ColorPicker
                        value={(cur && cur.solid?.color) || cur || "#000000"}
                        onChange={(v) => set(o.name, p.name, { solid: { color: v } })}
                      />
                    )}
                    {p.type.kind === "enum" && (
                      <Select
                        value={cur ?? ""}
                        onValueChange={(v) => set(o.name, p.name, v)}
                        options={p.type.options.map((o2) => ({ value: o2.value, label: o2.displayName }))}
                      />
                    )}
                    {p.type.kind === "unknown" && (
                      <Input value={cur ?? ""} onChange={(e) => set(o.name, p.name, e.target.value)} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      ))}
    </div>
  );
}
