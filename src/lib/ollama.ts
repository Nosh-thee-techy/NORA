/** Shared Ollama / Gemma connection settings for Nora chat. */

export const GEMMA_MODEL = "gemma:2b";
export const GEMMA_ENDPOINT = "/api/chat";
export const OLLAMA_STATUS_ENDPOINT = "/api/ollama-status";

/** Default local Ollama base — override with OLLAMA_URL in the environment. */
export function getOllamaBase(): string {
  return process.env["OLLAMA_URL"] ?? "http://127.0.0.1:11434";
}

/** True if a listed Ollama tag is our target gemma:2b (or a compatible gemma:2b-* tag). */
export function isGemma2bModel(name: string | undefined | null): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  if (n === "gemma:2b" || n === "gemma2:2b") return true;
  // e.g. gemma:2b-instruct-q4_0
  if (n.startsWith("gemma:2b-") || n.startsWith("gemma2:2b-")) return true;
  return false;
}
