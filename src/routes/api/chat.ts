import { createServerFn } from "@tanstack/react-start";

const OLLAMA_BASE = process.env["OLLAMA_URL"] ?? "http://localhost:11434";

type ChatBody = {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  options?: Record<string, unknown>;
};

/**
 * Proxies a chat request to Ollama and returns the raw Response
 * (including its streaming body) so the client can read NDJSON chunks.
 */
export const proxyChat = createServerFn({ method: "POST" })
  .validator((body: ChatBody) => body)
  .handler(async ({ data }): Promise<Response> => {
    try {
      const upstream = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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
