export type PropType =
  | { kind: "text" }
  | { kind: "bool" }
  | { kind: "numeric" }
  | { kind: "integer" }
  | { kind: "fill" }
  | { kind: "enum"; options: { value: string; displayName: string }[] }
  | { kind: "unknown" };

export interface PropSchema {
  name: string;
  displayName: string;
  description?: string;
  type: PropType;
}

export interface ObjectSchema {
  name: string;
  displayName: string;
  properties: PropSchema[];
}

export interface DataRoleSchema {
  name: string;
  kind: "Measure" | "Grouping" | string;
  displayName: string;
  description?: string;
}

export function parseObjects(capabilities: any): ObjectSchema[] {
  if (!capabilities?.objects) return [];
  const objs = capabilities.objects;
  return Object.keys(objs).map((name) => {
    const o = objs[name] ?? {};
    const properties: PropSchema[] = Object.keys(o.properties ?? {}).map((pname) => {
      const p = o.properties[pname];
      return {
        name: pname,
        displayName: p.displayName ?? pname,
        description: p.description,
        type: detectType(p.type),
      };
    });
    return { name, displayName: o.displayName ?? name, properties };
  });
}

function detectType(t: any): PropType {
  if (!t) return { kind: "unknown" };
  if (t.text) return { kind: "text" };
  if (t.bool !== undefined) return { kind: "bool" };
  if (t.numeric) return { kind: "numeric" };
  if (t.integer) return { kind: "integer" };
  if (t.fill) return { kind: "fill" };
  if (t.enumeration && Array.isArray(t.enumeration)) {
    return {
      kind: "enum",
      options: t.enumeration.map((e: any) => ({
        value: String(e.value),
        displayName: e.displayName ?? String(e.value),
      })),
    };
  }
  return { kind: "unknown" };
}

export function parseDataRoles(capabilities: any): DataRoleSchema[] {
  const roles = capabilities?.dataRoles;
  if (!Array.isArray(roles)) return [];
  return roles.map((r: any) => ({
    name: r.name,
    kind: r.kind,
    displayName: r.displayName ?? r.name,
    description: r.description,
  }));
}
