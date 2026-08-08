export { GEMMA_ENDPOINT, GEMMA_MODEL } from "@/lib/ollama";
import { GEMMA_ENDPOINT, GEMMA_MODEL } from "@/lib/ollama";
import { hasWebGPUSupport, streamWebGPUChat, analyzeHealthDataWebGPU } from "@/lib/webgpu-llm";
import { proxyChat } from "@/server/api/chat";

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

const CHAT_STORAGE_KEY = "nora-luna-chat-v1";

/** Persist chat messages to localStorage. */
export function saveChatMessages(messages: ChatMessage[]): void {
  try {
    // Only persist user + assistant messages (skip system)
    const toSave = messages.filter((m) => m.role !== "system");
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    /* storage unavailable */
  }
}

/** Restore chat messages from localStorage. */
export function loadChatMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ChatMessage[];
  } catch {
    /* corrupt or unavailable */
  }
  return [];
}

/** Clear persisted chat messages. */
export function clearChatMessages(): void {
  try {
    localStorage.removeItem(CHAT_STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
}

export async function streamGemmaChat(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (hasWebGPUSupport()) {
    try {
      return await streamWebGPUChat(messages, onChunk, signal);
    } catch (err) {
      console.warn("WebGPU inference failed, falling back to Ollama API:", err);
      // Fall through to Ollama
    }
  }

  const res = await proxyChat({
    data: {
      model: GEMMA_MODEL,
      messages,
      stream: true,
      options: {
        num_ctx: 4096,
        num_predict: 512,
        temperature: 0.7,
      },
    },
    ...(signal ? { signal } : {}),
  });

  if (!res.ok) throw new Error(`Gemma request failed (${res.status})`);
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const chunk = JSON.parse(trimmed) as { message?: { content?: string }; error?: string };
        if (chunk.error) throw new Error(chunk.error);
        const text = chunk.message?.content ?? "";
        if (text) onChunk(text);
      } catch (err) {
        if (err instanceof SyntaxError) continue;
        throw err;
      }
    }
  }
}

export type ReportData = {
  metrics: {
    daysMissed: string;
    nsaidEfficacy: string;
    avgPeakPain: string;
    cyclesLogged: string;
    painCyclicality: string;
    giUrinaryInvolvement: string;
    functionalImpact: string;
    compositeRiskScore: string;
  };
  timeline: {
    month: string;
    peak: number;
    flow: string;
    flags: string;
  }[];
  analysis: string;
};

const ANALYSIS_STORAGE_KEY = "nora-luna-analysis-v2";

export function saveAnalysis(data: ReportData): void {
  try {
    localStorage.setItem(ANALYSIS_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function loadAnalysis(): ReportData | null {
  try {
    const raw = localStorage.getItem(ANALYSIS_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ReportData;
  } catch {
    /* ignore */
  }
  return null;
}

export async function analyzeHealthData(
  context: string,
  history: ChatMessage[],
): Promise<ReportData> {
  if (hasWebGPUSupport()) {
    try {
      return await analyzeHealthDataWebGPU(context, history);
    } catch (err) {
      console.warn("WebGPU analysis failed, falling back to Ollama API:", err);
      // Fall through to Ollama
    }
  }

  const analyzerSystemPrompt = [
    "You are a clinical analysis engine working alongside Nora, a menstrual health tracking app that monitors endometriosis screening variables.",
    "Your job is to read the user's current physical state, their endometriosis tracking data, and their recent chat history, then extract key metrics and produce a clinical triage summary.",
    "",
    "CLINICAL VARIABLES TO ANALYZE:",
    "- Pain cyclicality: Does pain worsen in luteal→menstrual phases and ease in follicular→ovulation? This is the hallmark of endometriosis.",
    "- Multi-organ involvement: Look for the deep endo triad — dyschezia (painful bowel), dysuria (painful urination), and radiating back/leg pain occurring together.",
    "- Progressive worsening: Is pain severity increasing month-over-month?",
    "- Pain quality patterns: Stabbing/burning pain suggests nerve involvement; cramping/pressure is more typical of superficial endo.",
    "- GI/urinary symptoms: Bowel changes (constipation, diarrhea), bloating (endo belly), and urinary frequency/urgency.",
    "- Functional impact: Days missed work/school, reduced activity, poor sleep, fatigue levels.",
    "- Medication response: NSAID efficacy, hormonal therapy effects — poor NSAID response with cyclical pain is a strong endo signal.",
    "",
    "Do NOT diagnose the user — frame findings as a 'screening signal' or 'pattern analysis' to share with their doctor.",
    "",
    "You MUST respond ONLY with a strict JSON object matching this schema:",
    "{",
    "  \"metrics\": {",
    "    \"daysMissed\": \"string (e.g. '3')\",",
    "    \"nsaidEfficacy\": \"string (e.g. 'Low' or 'High')\",",
    "    \"avgPeakPain\": \"string (e.g. '8.2 / 10')\",",
    "    \"cyclesLogged\": \"string (e.g. '3 months')\",",
    "    \"painCyclicality\": \"string (e.g. 'Strong cyclical pattern' or 'Weak' or 'None detected')\",",
    "    \"giUrinaryInvolvement\": \"string (e.g. 'Present — bowel + bladder' or 'Absent')\",",
    "    \"functionalImpact\": \"string (e.g. 'Severe' or 'Moderate' or 'Mild')\",",
    "    \"compositeRiskScore\": \"string (e.g. '72/100 (High)')\"",
    "  },",
    "  \"timeline\": [",
    "    {",
    "      \"month\": \"string (e.g. 'Month 1')\",",
    "      \"peak\": number (1-10),",
    "      \"flow\": \"string (e.g. 'Heavy (5 days)')\",",
    "      \"flags\": \"string (e.g. 'Deep endo triad, progressive worsening')\"",
    "    }",
    "  ],",
    "  \"analysis\": \"string (2-3 paragraph clinical triage summary covering: pain pattern assessment, multi-organ screening, functional impact, and clinical recommendation)\"",
    "}",
    "",
    "Extract or estimate these values from the endometriosis tracking data and chat history provided below.",
    "",
    "--- USER STATE & ENDO TRACKING DATA ---",
    context,
  ].join("\n");

  const promptMessage: ChatMessage = {
    role: "user",
    content: "Please generate a clinical summary and screening signal JSON based on my data and our conversation history.",
  };

  const requestMessages = [
    { role: "system", content: analyzerSystemPrompt },
    ...history.filter((m) => m.role !== "system"),
    promptMessage,
  ];

  const res = await fetch(GEMMA_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GEMMA_MODEL,
      messages: requestMessages,
      stream: false,
      format: "json", // Force JSON output mode in Ollama
      options: { temperature: 0.1 },
    }),
  });

  if (!res.ok) throw new Error(`Analysis request failed (${res.status})`);
  
  const data = await res.json() as { message?: { content?: string }; error?: string };
  if (data.error) throw new Error(data.error);
  
  const rawContent = data.message?.content;
  if (!rawContent) throw new Error("No analysis could be generated.");

  try {
    return JSON.parse(rawContent) as ReportData;
  } catch (err) {
    throw new Error("Failed to parse the generated JSON from the model.");
  }
}
