/**
 * Rolling chat memory for Nora.
 *
 * Prevents context-window overflow by summarising older messages into a
 * compact "memory" block and only sending recent messages in full.
 *
 * Strategy:
 *   1. Estimate token count of each message (~4 chars ≈ 1 token).
 *   2. If total history fits within the budget → return as-is.
 *   3. If over budget → split into OLD + RECENT, summarise OLD via Gemma,
 *      persist the rolling summary, return [summary message] + RECENT.
 */

import type { ChatMessage } from "@/lib/gemma";
import { GEMMA_ENDPOINT, GEMMA_MODEL } from "@/lib/ollama";

// ── Constants ───────────────────────────────────────────────────────────

/** Approximate characters per token for Gemma-class models. */
const CHARS_PER_TOKEN = 4;

/**
 * Maximum token budget for history (excluding system prompt and new message).
 * Gemma 4 Q4 context is ~8 192 tokens.  Reserve ~3 000 for system prompt +
 * model response, leaving ~5 000 for history + memory.
 */
const HISTORY_TOKEN_BUDGET = 5_000;

/** Keep at least this many recent message pairs (user+assistant) in full. */
const MIN_RECENT_PAIRS = 4;

/** localStorage key for the persisted rolling summary. */
const MEMORY_KEY = "nora-luna-memory-v1";

// ── Token estimation ────────────────────────────────────────────────────

/** Rough token count for a string. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/** Sum token estimates for an array of chat messages. */
function estimateHistoryTokens(messages: ChatMessage[]): number {
  return messages.reduce(
    (sum, m) => sum + estimateTokens(m.content) + 4, // +4 for role/framing
    0,
  );
}

// ── Persisted rolling summary ───────────────────────────────────────────

export function loadMemorySummary(): string | null {
  try {
    return localStorage.getItem(MEMORY_KEY);
  } catch {
    return null;
  }
}

function saveMemorySummary(summary: string): void {
  try {
    localStorage.setItem(MEMORY_KEY, summary);
  } catch {
    /* storage unavailable */
  }
}

function clearMemorySummary(): void {
  try {
    localStorage.removeItem(MEMORY_KEY);
  } catch {
    /* storage unavailable */
  }
}

// ── Summarise old messages via Gemma ────────────────────────────────────

/**
 * Call Gemma (non-streaming) to compress a batch of messages into a short
 * summary paragraph.  Falls back to a naïve truncation if the call fails.
 */
async function summariseMessages(
  messages: ChatMessage[],
  existingSummary: string | null,
): Promise<string> {
  const transcript = messages
    .filter((m) => m.role !== "system")
    .map((m) => `${m.role === "user" ? "User" : "Nora"}: ${m.content}`)
    .join("\n");

  const systemPrompt = [
    "You are a memory compression engine for Nora, a menstrual health companion app.",
    "Your ONLY job is to produce a short, factual summary (max 200 words) of the conversation below.",
    "Focus on: health symptoms mentioned, pain descriptions, emotional state, cycle details, medication mentions, and any patterns the user described.",
    "Do NOT add advice or commentary. Just summarise the facts.",
    existingSummary
      ? `\nPrior memory summary to incorporate:\n${existingSummary}`
      : "",
  ].join("\n");

  try {
    const res = await fetch(GEMMA_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GEMMA_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Summarise this conversation:\n\n${transcript}` },
        ],
        stream: false,
        options: { temperature: 0.1 },
      }),
    });

    if (!res.ok) throw new Error(`Summary request failed (${res.status})`);

    const data = (await res.json()) as {
      message?: { content?: string };
      error?: string;
    };
    if (data.error) throw new Error(data.error);

    const summary = data.message?.content?.trim();
    if (summary && summary.length > 10) return summary;

    throw new Error("Empty summary returned");
  } catch (err) {
    console.warn("[chat-memory] Summarisation failed, using naïve fallback:", err);
    // Fallback: take first + last few messages as a crude summary
    return naïveSummary(messages, existingSummary);
  }
}

/** Crude fallback when Gemma summarisation fails. */
function naïveSummary(
  messages: ChatMessage[],
  existingSummary: string | null,
): string {
  const userMessages = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content);

  const snippets = [
    ...userMessages.slice(0, 3),
    ...(userMessages.length > 6 ? userMessages.slice(-2) : []),
  ];

  const base = existingSummary ? `${existingSummary} ` : "";
  return `${base}Earlier topics: ${snippets.join("; ").slice(0, 600)}`;
}

// ── Main windowing function ─────────────────────────────────────────────

export type WindowedResult = {
  /** Messages to send (may include a memory summary as first assistant msg). */
  messages: ChatMessage[];
  /** Whether summarisation was performed this call. */
  didSummarise: boolean;
  /** Updated rolling summary (save this to localStorage). */
  memorySummary: string | null;
};

/**
 * Window chat history to fit within the token budget.
 *
 * - If history fits → returns as-is.
 * - If too long → summarises old messages, returns summary + recent.
 */
export async function windowHistory(
  allMessages: ChatMessage[],
  budget: number = HISTORY_TOKEN_BUDGET,
): Promise<WindowedResult> {
  // Filter out system messages — they're handled separately
  const nonSystem = allMessages.filter((m) => m.role !== "system");

  const totalTokens = estimateHistoryTokens(nonSystem);

  // Fits? Return as-is.
  if (totalTokens <= budget) {
    return {
      messages: nonSystem,
      didSummarise: false,
      memorySummary: loadMemorySummary(),
    };
  }

  // Split: keep recent messages, summarise the rest
  const recentCount = Math.max(MIN_RECENT_PAIRS * 2, 8);
  const recent = nonSystem.slice(-recentCount);
  const old = nonSystem.slice(0, -recentCount);

  if (old.length === 0) {
    // All messages are "recent" — just truncate from the front
    return {
      messages: recent,
      didSummarise: false,
      memorySummary: loadMemorySummary(),
    };
  }

  // Summarise old messages (incorporating any existing rolling summary)
  const existingSummary = loadMemorySummary();
  const newSummary = await summariseMessages(old, existingSummary);

  // Persist the rolling summary
  saveMemorySummary(newSummary);

  // Build the memory context message
  const memoryMessage: ChatMessage = {
    role: "assistant",
    content: `[Memory from earlier conversations]\n${newSummary}`,
  };

  return {
    messages: [memoryMessage, ...recent],
    didSummarise: true,
    memorySummary: newSummary,
  };
}

/**
 * Quick check: should we trigger a background summarisation?
 * Returns true when history is approaching the budget limit.
 */
export function shouldSummarise(messages: ChatMessage[]): boolean {
  const nonSystem = messages.filter((m) => m.role !== "system");
  const tokens = estimateHistoryTokens(nonSystem);
  // Trigger at 80% of budget to summarise proactively
  return tokens > HISTORY_TOKEN_BUDGET * 0.8;
}
