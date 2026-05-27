import type { DataRoleSchema } from "./capabilitiesSchema";

export interface FieldConfig {
  id: string;
  role: string;
  displayName: string;
  values: (string | number)[];
  kind: "measure" | "grouping";
}

export interface DataViewConfig {
  fields: FieldConfig[];
}

interface ColumnSource {
  displayName: string;
  queryName: string;
  roles: Record<string, boolean>;
  isMeasure?: boolean;
  type?: any;
}

interface BuiltCategory {
  source: ColumnSource;
  values: any[];
}

interface BuiltValue {
  source: ColumnSource;
  values: any[];
}

export function buildDataView(
  config: DataViewConfig,
  objects: Record<string, Record<string, unknown>>,
  roles: DataRoleSchema[],
) {
  const roleKindMap: Record<string, string> = {};
  for (const r of roles) roleKindMap[r.name] = r.kind;

  const categories: BuiltCategory[] = [];
  const values: BuiltValue[] = [];
  const columns: ColumnSource[] = [];

  for (const f of config.fields) {
    const isMeasure = (roleKindMap[f.role] ?? "") === "Measure" || f.kind === "measure";
    const src: ColumnSource = {
      displayName: f.displayName,
      queryName: `${f.role}.${f.displayName}`,
      roles: { [f.role]: true },
      isMeasure,
    };
    columns.push(src);
    if (isMeasure) {
      const vals = f.values.map((v) =>
        typeof v === "string" ? (isNaN(Number(v)) ? v : Number(v)) : v,
      );
      values.push({ source: src, values: vals });
    } else {
      categories.push({ source: src, values: f.values });
    }
  }

  return {
    metadata: { columns, objects },
    categorical: {
      categories: categories.length ? categories : undefined,
      values: values.length ? values : undefined,
    },
  };
}
