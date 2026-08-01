import { createServerFn } from "@tanstack/react-start";
import { GEMMA_MODEL, getOllamaBase, isTargetModel } from "@/lib/ollama";

export type OllamaStatusResult = {
  status: "connected" | "disconnected";
  modelAvailable: boolean;
  targetModel: string;
  error?: string;
  models?: string[];
};

export const getOllamaStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<OllamaStatusResult> => {
    const OLLAMA_BASE = getOllamaBase();
    try {
      const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
        signal: AbortSignal.timeout(4000),
      });

      if (!res.ok) {
        return {
          status: "disconnected",
          modelAvailable: false,
          targetModel: GEMMA_MODEL,
          error: `Ollama returned ${res.status}`,
        };
      }

      const data = (await res.json()) as {
        models?: Array<{ name?: string; model?: string }>;
      };

      const models = (data.models ?? [])
        .map((m) => m.name ?? m.model)
        .filter(Boolean) as string[];

      const modelAvailable = models.some((name) => isTargetModel(name));

      return {
        status: "connected",
        modelAvailable,
        targetModel: GEMMA_MODEL,
        models,
      };
    } catch {
      return {
        status: "disconnected",
        modelAvailable: false,
        targetModel: GEMMA_MODEL,
        error: `Cannot reach Ollama at ${OLLAMA_BASE} — is \`ollama serve\` running?`,
      };
    }
  },
);
