import { CreateMLCEngine, MLCEngine, InitProgressReport } from "@mlc-ai/web-llm";
import type { ChatMessage, ReportData } from "./gemma";

export const WEBGPU_MODEL_ID = "gemma-2-2b-it-q4f16_1-MLC";

let engineInstance: MLCEngine | null = null;
let isInitializing = false;

/** Check if the browser supports WebGPU */
export function hasWebGPUSupport(): boolean {
  return typeof navigator !== "undefined" && (navigator as any).gpu !== undefined;
}

/** Initialize the WebLLM engine with progress callback */
export async function initWebGPUEngine(
  onProgress?: (progress: InitProgressReport) => void
): Promise<MLCEngine> {
  if (engineInstance) return engineInstance;
  if (isInitializing) {
    // Wait for existing initialization to finish (simple polling)
    while (isInitializing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (engineInstance) return engineInstance;
  }

  isInitializing = true;
  try {
    engineInstance = await CreateMLCEngine(WEBGPU_MODEL_ID, {
      ...(onProgress ? { initProgressCallback: onProgress } : {}),
    });
    return engineInstance;
  } finally {
    isInitializing = false;
  }
}

/** Stream chat completion from WebGPU */
export async function streamWebGPUChat(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const engine = await initWebGPUEngine();
  
  // Create an async generator for the chat completion
  const asyncChunkGenerator = await engine.chat.completions.create({
    messages,
    stream: true,
    temperature: 0.7,
  });

  for await (const chunk of asyncChunkGenerator) {
    if (signal?.aborted) {
      break;
    }
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      onChunk(content);
    }
  }
}

/** Generate health analysis using WebGPU (non-streaming JSON output) */
export async function analyzeHealthDataWebGPU(
  context: string,
  history: ChatMessage[]
): Promise<ReportData> {
  const engine = await initWebGPUEngine();

  const analyzerSystemPrompt = [
    "You are a clinical analysis engine working alongside Nora, a menstrual health tracking app.",
    "Your job is to read the user's current physical state and their recent chat history, then extract key metrics and produce a clinical triage summary.",
    "Identify any patterns consistent with endometriosis or other reproductive health conditions (e.g., cyclical deep pelvic pain, radiating leg pain, endo belly).",
    "Do NOT diagnose the user—frame it as a 'screening signal' or 'pattern analysis' to share with their doctor.",
    "",
    "You MUST respond ONLY with a strict JSON object matching this schema:",
    "{",
    "  \"metrics\": {",
    "    \"daysMissed\": \"string (e.g. '3')\",",
    "    \"nsaidEfficacy\": \"string (e.g. 'Low' or 'High')\",",
    "    \"avgPeakPain\": \"string (e.g. '8.2 / 10')\",",
    "    \"cyclesLogged\": \"string (e.g. '3 months')\"",
    "  },",
    "  \"timeline\": [",
    "    {",
    "      \"month\": \"string (e.g. 'Month 1')\",",
    "      \"peak\": number (1-10),",
    "      \"flow\": \"string (e.g. 'Heavy (5 days)')\",",
    "      \"flags\": \"string (e.g. 'Bowel pain')\"",
    "    }",
    "  ],",
    "  \"analysis\": \"string (1-2 paragraph clinical triage summary)\"",
    "}",
    "",
    "Extract or estimate these values reasonably based on the user's chat history and current context.",
    "",
    "--- USER STATE ---",
    context,
  ].join("\n");

  const promptMessage: ChatMessage = {
    role: "user",
    content: "Please generate a clinical summary and screening signal JSON based on my data and our conversation history.",
  };

  const requestMessages = [
    { role: "system" as const, content: analyzerSystemPrompt },
    ...history.filter((m) => m.role !== "system").map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    promptMessage,
  ];

  const response = await engine.chat.completions.create({
    messages: requestMessages,
    stream: false,
    temperature: 0.1,
    // Note: WebLLM supports response_format: { type: "json_object" } for many models,
    // which helps force valid JSON output.
    response_format: { type: "json_object" },
  });

  const rawContent = response.choices[0]?.message?.content;
  if (!rawContent) throw new Error("No analysis could be generated.");

  try {
    return JSON.parse(rawContent) as ReportData;
  } catch (err) {
    throw new Error("Failed to parse the generated JSON from the model.");
  }
}
