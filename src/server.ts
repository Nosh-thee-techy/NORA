import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      const OLLAMA_BASE = process.env["OLLAMA_URL"] ?? "http://127.0.0.1:11434";
      const GEMMA_MODEL = process.env["GEMMA_MODEL"] ?? "gemma:2b";

      if (url.pathname === "/api/ollama-status" && request.method === "GET") {
        try {
          const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
            signal: AbortSignal.timeout(4000),
          });
          if (!res.ok) {
            return Response.json({
              status: "disconnected",
              modelAvailable: false,
              targetModel: GEMMA_MODEL,
              error: `Ollama returned ${res.status}`,
            });
          }
          const data = (await res.json()) as {
            models?: Array<{ name?: string; model?: string }>;
          };
          const models = (data.models ?? [])
            .map((m) => m.name ?? m.model)
            .filter(Boolean) as string[];
          const modelAvailable = models.some((name) => {
            const n = name.toLowerCase();
            return (
              n === "gemma:2b" ||
              n === "gemma2:2b" ||
              n.startsWith("gemma:2b-") ||
              n.startsWith("gemma2:2b-")
            );
          });
          return Response.json({
            status: "connected",
            modelAvailable,
            targetModel: GEMMA_MODEL,
            models,
          });
        } catch {
          return Response.json({
            status: "disconnected",
            modelAvailable: false,
            targetModel: GEMMA_MODEL,
            error: `Cannot reach Ollama at ${OLLAMA_BASE}`,
          });
        }
      }

      if (url.pathname === "/api/chat" && request.method === "POST") {
        // Pass through the request payload, forcing gemma:2b when model is missing
        const raw = await request.text();
        let body = raw;
        try {
          const parsed = JSON.parse(raw) as { model?: string };
          if (!parsed.model) {
            body = JSON.stringify({ ...parsed, model: GEMMA_MODEL });
          }
        } catch {
          /* keep raw body */
        }

        const upstream = await fetch(`${OLLAMA_BASE}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });

        return new Response(upstream.body, {
          status: upstream.status,
          headers: {
            "Content-Type":
              upstream.headers.get("Content-Type") ?? "application/x-ndjson",
            "Cache-Control": "no-cache",
          },
        });
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
