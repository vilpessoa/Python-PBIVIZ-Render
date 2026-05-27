import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { parseDataRoles } from "@/lib/capabilitiesSchema";
import type { DataViewConfig, FieldConfig } from "@/lib/dataViewFactory";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";

let _id = 1000;
const nid = () => `f${++_id}`;

export function DataViewBuilder({
  capabilities,
  value,
  onChange,
}: {
  capabilities: any;
  value: DataViewConfig;
  onChange: (next: DataViewConfig) => void;
}) {
  const roles = useMemo(() => parseDataRoles(capabilities), [capabilities]);

  const addField = () => {
    const r = roles[0];
    const f: FieldConfig = {
      id: nid(),
      role: r?.name ?? "category",
      displayName: r?.displayName ?? "Campo",
      kind: r?.kind === "Measure" ? "measure" : "grouping",
      values: [],
    };
    onChange({ fields: [...value.fields, f] });
  };

  const update = (id: string, patch: Partial<FieldConfig>) => {
    onChange({ fields: value.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  };

  const remove = (id: string) => {
    onChange({ fields: value.fields.filter((f) => f.id !== id) });
  };

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">Campos (DataView)</span>
        <Button size="sm" variant="outline" onClick={addField}>
          <Plus className="h-3 w-3" /> Adicionar
        </Button>
      </div>
      {value.fields.length === 0 && (
        <div className="rounded border border-dashed border-border p-3 text-xs text-muted">
          Nenhum campo. Clique em Adicionar para simular dados conectados ao visual.
        </div>
      )}
      {value.fields.map((f) => (
        <div key={f.id} className="space-y-2 rounded-md border border-border bg-panel p-2">
          <div className="grid grid-cols-[1fr_120px_28px] gap-2 items-center">
            <Input
              value={f.displayName}
              onChange={(e) => update(f.id, { displayName: e.target.value })}
              placeholder="Nome"
            />
            <Select
              value={f.role}
              onValueChange={(v) => {
                const r = roles.find((x) => x.name === v);
                update(f.id, {
                  role: v,
                  kind: r?.kind === "Measure" ? "measure" : "grouping",
                });
              }}
              options={roles.map((r) => ({ value: r.name, label: r.displayName }))}
            />
            <Button size="icon" variant="ghost" onClick={() => remove(f.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <Input
            value={f.values.join(", ")}
            onChange={(e) => update(f.id, { values: e.target.value.split(/\s*,\s*/).filter(Boolean) })}
            placeholder="Valores separados por virgula"
          />
        </div>
      ))}
    </div>
  );
}
