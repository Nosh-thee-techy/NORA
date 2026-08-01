/** Shared Ollama / Gemma connection settings for Nora chat. */

export const GEMMA_MODEL = "batiai/gemma4-e2b:q4";
export const GEMMA_ENDPOINT = "/api/chat";
export const OLLAMA_STATUS_ENDPOINT = "/api/ollama-status";

/** Default local Ollama base — override with OLLAMA_URL in the environment. */
export function getOllamaBase(): string {
  return process.env["OLLAMA_URL"] ?? "http://127.0.0.1:11434";
}

/** True if a listed Ollama tag matches our target model. */
export function isTargetModel(name: string | undefined | null): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  if (n === "batiai/gemma4-e2b:q4") return true;
  if (n.startsWith("batiai/gemma4-e2b")) return true;
  return false;
}
