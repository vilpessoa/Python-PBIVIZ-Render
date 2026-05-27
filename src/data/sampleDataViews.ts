import type { DataViewConfig } from "../lib/dataViewFactory";

export const SAMPLE_TESS_V3: DataViewConfig = {
  fields: [
    {
      id: "f1",
      role: "measure",
      displayName: "Total Vendas",
      kind: "measure",
      values: [1250000],
    },
    {
      id: "f2",
      role: "category",
      displayName: "Categoria",
      kind: "grouping",
      values: ["Bebidas", "Laticinios", "Padaria", "Hortifruti"],
    },
    {
      id: "f3",
      role: "date",
      displayName: "Mes",
      kind: "grouping",
      values: ["2025-01", "2025-02", "2025-03"],
    },
    {
      id: "f4",
      role: "systemPrompt",
      displayName: "Prompt do Sistema",
      kind: "measure",
      values: ["Voce e um analista de vendas. Responda em portugues."],
    },
  ],
};
