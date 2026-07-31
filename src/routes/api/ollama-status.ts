import { createServerFn } from "@tanstack/react-start";

const OLLAMA_BASE = process.env["OLLAMA_URL"] ?? "http://localhost:11434";
const TARGET_MODEL = "gemma:2b";

export type OllamaStatusResult = {
  status: "connected" | "disconnected";
  modelAvailable: boolean;
  error?: string;
  models?: string[];
};

export const getOllamaStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<OllamaStatusResult> => {
    try {
      const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });

      if (!res.ok) {
        return {
          status: "disconnected",
          modelAvailable: false,
          error: `Ollama returned ${res.status}`,
        };
      }

      const data = (await res.json()) as {
        models?: Array<{ name?: string }>;
      };

      const models = data.models ?? [];
      const modelAvailable = models.some(
        (m) =>
          m.name === TARGET_MODEL ||
          m.name?.startsWith(TARGET_MODEL.split(":")[0] + ":"),
      );

      return {
        status: "connected",
        modelAvailable,
        models: models.map((m) => m.name).filter(Boolean) as string[],
      };
    } catch {
      return {
        status: "disconnected",
        modelAvailable: false,
        error: "Cannot reach Ollama — is it running?",
      };
    }
  },
);
