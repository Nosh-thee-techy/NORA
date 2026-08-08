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
