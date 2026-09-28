import type { ZodType } from "zod";
import { config } from "./config";

export interface ChatOptions { timeoutMs?: number; system?: string; temperature?: number }

/**
 * Single LLM wrapper: OpenAI-compatible chat completions → strict JSON validated by zod.
 * Returns null on ANY failure (no key, timeout, HTTP error, invalid JSON, schema mismatch). Never throws.
 */
export async function chatJSON<T>(prompt: string, schema: ZodType<T>, opts: ChatOptions = {}): Promise<T | null> {
  if (!config.LLM_API_KEY) return null;
  const timeoutMs = opts.timeoutMs ?? 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `${config.LLM_BASE_URL.replace(/\/+$/, "")}/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${config.LLM_API_KEY}` },
      body: JSON.stringify({
        model: config.LLM_MODEL,
        temperature: opts.temperature ?? 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: opts.system ?? "You are a precise assistant. Reply with a single JSON object only, no prose, no markdown." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) {
      console.warn(`[llm] HTTP ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`);
      return null;
    }
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;
    const parsed = schema.safeParse(JSON.parse(extractJson(content)));
    if (!parsed.success) {
      console.warn(`[llm] schema mismatch: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
      return null;
    }
    return parsed.data;
  } catch (e) {
    console.warn(`[llm] failed: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Strips ```json fences and grabs the outermost {...} so slightly chatty models still parse. */
function extractJson(s: string): string {
  const t = s.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const a = t.indexOf("{");
  const z = t.lastIndexOf("}");
  return a >= 0 && z > a ? t.slice(a, z + 1) : t;
}
