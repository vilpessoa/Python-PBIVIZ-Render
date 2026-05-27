// Vercel serverless function: proxies requests to Google Gemini.
// Expects POST { action, code, apiKey? } -> { text }

const SYSTEM: Record<string, string> = {
  refactor:
    "Voce eh um expert em Python e em build scripts para Power BI custom visuals (PBIVIZ). " +
    "Refatore o script abaixo para melhorar legibilidade e manutencao, mas PRESERVE as variaveis globais CSS, JS, CAPABILITIES e GUID. " +
    "Retorne apenas o codigo final em bloco ```python.",
  format:
    "Formate o script Python abaixo seguindo PEP8. Preserve CSS, JS, CAPABILITIES e GUID. Retorne apenas o codigo em bloco ```python.",
  comment:
    "Adicione comentarios curtos e docstrings explicando as principais secoes do build script. Preserve todo o conteudo. Retorne apenas o codigo em bloco ```python.",
  debug:
    "Analise o script abaixo, aponte erros logicos ou de runtime e devolva uma versao corrigida. Preserve CSS, JS, CAPABILITIES e GUID. Retorne apenas o codigo em bloco ```python.",
};

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const { action, code, apiKey } = await req.json();
    const sys = SYSTEM[action];
    if (!sys) return new Response("Invalid action", { status: 400 });
    const key = apiKey || (globalThis as any).process?.env?.GEMINI_API_KEY;
    if (!key) return new Response("Missing GEMINI_API_KEY", { status: 500 });

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
      encodeURIComponent(key);

    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: sys }] },
        contents: [{ role: "user", parts: [{ text: "```python\n" + code + "\n```" }] }],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.4 },
      }),
    });

    if (!upstream.ok) {
      const t = await upstream.text();
      return new Response(t, { status: upstream.status });
    }
    const d: any = await upstream.json();
    const text = d?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(String(e?.message ?? e), { status: 500 });
  }
}
