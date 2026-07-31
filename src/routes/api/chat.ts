import { createServerFn } from "@tanstack/react-start";
import { GEMMA_MODEL, getOllamaBase } from "@/lib/ollama";

type ChatBody = {
  model?: string;
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  format?: string;
  options?: Record<string, unknown>;
};

/**
 * Proxies a chat request to Ollama and returns the raw Response
 * (including its streaming body) so the client can read NDJSON chunks.
 */
export const proxyChat = createServerFn({ method: "POST" })
  .validator((body: ChatBody) => body)
  .handler(async ({ data }): Promise<Response> => {
    const OLLAMA_BASE = getOllamaBase();
    const payload = {
      ...data,
      model: data.model && data.model.length > 0 ? data.model : GEMMA_MODEL,
    };
    try {
      const upstream = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!upstream.ok) {
        return new Response(
          JSON.stringify({
            error: `Ollama returned ${upstream.status}`,
          }),
          {
            status: upstream.status,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Stream the NDJSON response back to the client
      return new Response(upstream.body, {
        status: 200,
        headers: {
          "Content-Type": "application/x-ndjson",
          "Cache-Control": "no-cache",
        },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reach Ollama";
      return new Response(JSON.stringify({ error: message }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }
  });
