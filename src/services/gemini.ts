export type AIAction = "refactor" | "format" | "comment" | "debug";

export async function askGemini(action: AIAction, code: string, apiKey?: string): Promise<string> {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, code, apiKey }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${t}`);
  }
  const d = await res.json();
  return d.text ?? "";
}
