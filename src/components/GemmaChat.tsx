import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Send,
  Sparkles,
  AlertCircle,
  RotateCcw,
  Square,
  Wifi,
  WifiOff,
  Loader2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useNora, type PainPoint } from "@/store/nora";
import { PHASE_META, SYMPTOMS, type Phase } from "@/lib/cycle";
import {
  streamGemmaChat,
  saveChatMessages,
  loadChatMessages,
  clearChatMessages,
  type ChatMessage,
} from "@/lib/gemma";
import { GEMMA_MODEL } from "@/lib/ollama";
import { useOllamaStatus } from "@/hooks/useOllamaStatus";
import { avatarById } from "@/lib/avatars";
import { canSpeak, speakText, stopSpeaking } from "@/lib/speech";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Analyze my current symptoms",
  "Why am I so tired today?",
  "Any tips for endo belly?",
  "Help me feel calmer",
];

function buildNoraSystemPrompt(
  day: number,
  phase: Phase,
  energy: number,
  symptoms: string[],
  painPoints: PainPoint[],
  companionName: string,
): string {
  const labels = symptoms.length
    ? symptoms.map((id) => SYMPTOMS.find((s) => s.id === id)?.label ?? id).join(", ")
    : "none";

  const phaseInfo = PHASE_META[phase];

  // Calculate day-of-phase context
  const dayOfPhase = (() => {
    const d = ((day - 1) % 28) + 1;
    if (d <= 5) return `Day ${d} of menstrual phase`;
    if (d <= 12) return `Day ${d - 5} of follicular phase`;
    if (d <= 16) return `Day ${d - 12} of ovulation phase`;
    return `Day ${d - 16} of luteal phase`;
  })();

  // Pain point context
  const painContext =
    painPoints.length > 0
      ? `Mapped pain points: ${painPoints
          .map(
            (p) =>
              `${p.region} (intensity ${p.intensity}/10, ${
                p.depth <= 3 ? "surface" : p.depth <= 7 ? "mid-depth" : "deep internal"
              })`,
          )
          .join("; ")}.`
      : "No mapped pain points.";

  return [
    `You are Nora, speaking through the user's chosen companion face "${companionName}" inside the Nora menstrual health and endometriosis awareness app.`,
    "Speak gently, in short, caring sentences. Never clinical or scary. You are not a doctor and must not diagnose or prescribe; if something sounds urgent, gently suggest reaching out to a healthcare provider.",
    `Current context — cycle day ${day} (${phaseInfo.label} phase, ${dayOfPhase}), energy ${energy}%, logged symptoms: ${labels}.`,
    painContext,
    `Companion mood form: "${phaseInfo.lunaName}" — ${phaseInfo.blurb}`,
    "Keep replies as short as possible (1-2 sentences max) unless the user asks for important work or complex information where more detail is necessary. Use warmth and emoji sparingly. Be supportive and body-positive.",
  ].join("\n");
}

/** Minimal inline markdown: **bold**, *italic*, line breaks */
function renderMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Split on double newline for paragraphs
  const paragraphs = text.split(/\n{2,}/);

  paragraphs.forEach((para, pi) => {
    if (pi > 0) nodes.push(<br key={`br-${pi}`} />);

    // Process inline formatting within each paragraph
    const lines = para.split("\n");
    lines.forEach((line, li) => {
      if (li > 0) nodes.push(<br key={`lbr-${pi}-${li}`} />);

      // Bold + italic patterns
      const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
      parts.forEach((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          nodes.push(
            <strong key={`b-${pi}-${li}-${i}`}>{part.slice(2, -2)}</strong>,
          );
        } else if (part.startsWith("*") && part.endsWith("*")) {
          nodes.push(
            <em key={`i-${pi}-${li}-${i}`}>{part.slice(1, -1)}</em>,
          );
        } else {
          nodes.push(part);
        }
      });
    });
  });

  return nodes;
}

/** Animated 3-dot typing indicator */
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block h-1.5 w-1.5 rounded-full bg-current"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}

/** Connection status badge */
function StatusBadge({
  status,
  modelAvailable,
}: {
  status: "connected" | "disconnected" | "checking";
  modelAvailable: boolean;
}) {
  if (status === "checking") {
    return (
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking…
      </span>
    );
  }

  if (status === "disconnected") {
    return (
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-destructive">
        <WifiOff className="h-3 w-3" />
        Offline
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
      <Wifi className="h-3 w-3" />
      {modelAvailable ? "Connected" : "Model missing"}
    </span>
  );
}

export function GemmaChat({ layout = "page" }: { layout?: "page" | "card" }) {
  const { cycleDay, phase, energy, symptoms, painPoints, profile } = useNora();
  const companion = avatarById(profile.avatarId);
  const {
    status: ollamaStatus,
    modelAvailable,
    targetModel,
    recheck,
  } = useOllamaStatus();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isPage = layout === "page";
  const avatarSpeaking = streaming || speaking;

  // Hydrate chat from localStorage on mount
  useEffect(() => {
    const saved = loadChatMessages();
    if (saved.length > 0) setMessages(saved);
    setHydrated(true);
  }, []);

  // Persist messages on change (skip system messages, wait for hydration)
  useEffect(() => {
    if (hydrated && messages.length > 0) saveChatMessages(messages);
  }, [messages, hydrated]);

  // Auto-scroll to bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming, speaking]);

  // Cleanup abort + speech on unmount
  useEffect(
    () => () => {
      abortRef.current?.abort();
      stopSpeaking();
    },
    [],
  );

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
    }
  }, []);

  const isDisabled = ollamaStatus === "disconnected" || !modelAvailable;

  function playAssistantVoice(text: string, messageIndex: number) {
    if (!voiceOn || !canSpeak() || !text.trim()) return;
    setSpeakingMessageIndex(messageIndex);
    speakText(text, {
      onStart: () => setSpeaking(true),
      onEnd: () => {
        setSpeaking(false);
        setSpeakingMessageIndex(null);
      },
      onError: () => {
        setSpeaking(false);
        setSpeakingMessageIndex(null);
      },
    });
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setInput("");
    setError(null);
    stopSpeaking();
    setSpeaking(false);
    setSpeakingMessageIndex(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const system = buildNoraSystemPrompt(
      cycleDay,
      phase,
      energy,
      symptoms,
      painPoints,
      companion.name,
    );
    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const history = messages.length ? messages : [{ role: "system" as const, content: system }];

    setMessages((m) => [...m, userMessage]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let acc = "";

    try {
      await streamGemmaChat(
        [...history, userMessage],
        (chunk) => {
          acc += chunk;
          setMessages((m) => {
            const next = [...m];
            const last = next[next.length - 1];
            if (last?.role === "assistant") next[next.length - 1] = { ...last, content: acc };
            else next.push({ role: "assistant", content: acc });
            return next;
          });
        },
        controller.signal,
      );
      // Speak the completed reply with the companion avatar "talking"
      const assistantIndex = (messages.length ? messages.length : 0) + 1; // user + assistant
      playAssistantVoice(acc, assistantIndex);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(
        "I couldn't reach the Gemma model. Is Ollama running on this machine?",
      );
      // Trigger a recheck of Ollama status
      void recheck();
      console.error(err);
    } finally {
      abortRef.current = null;
      setStreaming(false);
    }
  }

  function stopGeneration() {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    stopSpeaking();
    setSpeaking(false);
    setSpeakingMessageIndex(null);
  }

  function clearChat() {
    setMessages([]);
    clearChatMessages();
    setError(null);
    stopSpeaking();
    setSpeaking(false);
    setSpeakingMessageIndex(null);
  }

  function toggleVoice() {
    if (voiceOn) {
      stopSpeaking();
      setSpeaking(false);
      setSpeakingMessageIndex(null);
    }
    setVoiceOn((v) => !v);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  return (
    <section
      className={
        isPage
          ? "flex min-h-0 flex-1 flex-col rounded-4xl glass-panel p-4 sm:p-5"
          : "mt-4 rounded-4xl glass-panel p-5"
      }
    >
      <div className="flex shrink-0 items-center gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className={isPage ? "text-lg font-extrabold tracking-tight" : "text-sm font-bold"}>
              Talk to Nora
            </h2>
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          </div>
          {isPage && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Nora speaks through {companion.name} — voice + image, grounded in today’s cycle.
            </p>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            aria-label={voiceOn ? "Mute companion voice" : "Unmute companion voice"}
            aria-pressed={voiceOn}
            onClick={toggleVoice}
            className={cn(
              "rounded-full p-1.5",
              voiceOn ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground",
            )}
          >
            {voiceOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
          <StatusBadge status={ollamaStatus} modelAvailable={modelAvailable} />
          {messages.length > 0 && (
            <button
              aria-label="Clear chat"
              onClick={clearChat}
              className="rounded-full bg-secondary p-1.5 text-secondary-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Companion stage — avatar image "speaks" with voice replies */}
      <div className="relative mt-3 flex shrink-0 flex-col items-center">
        <motion.div
          animate={
            avatarSpeaking
              ? { scale: [1, 1.04, 1], y: [0, -3, 0] }
              : { scale: 1, y: 0 }
          }
          transition={
            avatarSpeaking
              ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.25 }
          }
          className="relative"
        >
          <img
            src={companion.url}
            alt={companion.name}
            className="h-28 w-28 object-contain drop-shadow-[0_14px_28px_color-mix(in_oklab,var(--phase)_35%,transparent)] sm:h-32 sm:w-32"
          />
          {avatarSpeaking && (
            <span className="absolute inset-x-6 bottom-1 flex items-end justify-center gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.span
                  key={i}
                  className="w-1 rounded-full bg-phase-deep"
                  animate={{ height: ["6px", "16px", "6px"] }}
                  transition={{
                    duration: 0.55,
                    repeat: Infinity,
                    delay: i * 0.08,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </span>
          )}
        </motion.div>
        <p className="mt-1 text-center text-xs font-bold text-foreground">
          {streaming
            ? `${companion.name} is composing…`
            : speaking
              ? `${companion.name} is speaking…`
              : `${companion.name} · ${companion.mood}`}
        </p>
      </div>

      {ollamaStatus === "disconnected" ? (
        <div className="mt-3 shrink-0 rounded-2xl bg-destructive/10 px-4 py-3">
          <p className="text-xs font-semibold text-destructive">
            Ollama is not reachable
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Nora chats through local <strong>{GEMMA_MODEL}</strong>. Start Ollama, then:
          </p>
          <code className="mt-1.5 block rounded-lg bg-foreground/5 px-3 py-2 text-[11px] text-foreground">
            ollama serve && ollama run {GEMMA_MODEL}
          </code>
          <button
            type="button"
            onClick={() => void recheck()}
            className="mt-2 text-[11px] font-bold text-destructive underline"
          >
            Recheck connection
          </button>
        </div>
      ) : ollamaStatus === "connected" && !modelAvailable ? (
        <div className="mt-3 shrink-0 rounded-2xl bg-amber-500/10 px-4 py-3">
          <p className="text-xs font-semibold text-amber-700">
            Model not found
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Ollama is running but <strong>{targetModel || GEMMA_MODEL}</strong> isn’t available yet. Pull it:
          </p>
          <code className="mt-1.5 block rounded-lg bg-foreground/5 px-3 py-2 text-[11px] text-foreground">
            ollama pull {GEMMA_MODEL}
          </code>
          <button
            type="button"
            onClick={() => void recheck()}
            className="mt-2 text-[11px] font-bold text-amber-800 underline"
          >
            Recheck models
          </button>
        </div>
      ) : (
        <p className="mt-2 shrink-0 text-xs text-muted-foreground">
          Connected to <strong>{GEMMA_MODEL}</strong> on your machine — messages stream from Ollama.
        </p>
      )}

      <div
        ref={scrollRef}
        className={
          isPage
            ? "mt-4 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1"
            : "mt-4 flex max-h-72 min-h-24 flex-col gap-2 overflow-y-auto pr-1"
        }
      >
        {messages.length === 0 && !streaming && (
          <div
            className={
              isPage
                ? "flex flex-1 flex-col items-center justify-center gap-3 px-2 py-6 text-center"
                : "flex flex-col items-center gap-2 py-4 text-center"
            }
          >
            <p className={isPage ? "text-base font-semibold text-foreground" : "text-sm text-muted-foreground"}>
              Say hi — {companion.name} will answer with voice and presence.
            </p>
            {isPage && (
              <p className="max-w-sm text-sm text-muted-foreground">
                Replies use your cycle day, energy, and logged symptoms for grounded support.
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  disabled={isDisabled}
                  className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
              {m.content}
            </div>
          ) : m.role === "assistant" ? (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mr-auto flex max-w-[92%] items-end gap-2"
            >
              <img
                src={companion.url}
                alt=""
                aria-hidden
                className={cn(
                  "mb-0.5 h-10 w-10 shrink-0 object-contain",
                  speakingMessageIndex === i && "drop-shadow-[0_0_12px_color-mix(in_oklab,var(--phase)_55%,transparent)]",
                )}
              />
              <div className="min-w-0 rounded-2xl bg-card px-4 py-2.5 text-sm">
                {renderMarkdown(m.content)}
                {canSpeak() && (
                  <button
                    type="button"
                    onClick={() => playAssistantVoice(m.content, i)}
                    className="mt-2 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-accent-foreground"
                  >
                    <Volume2 className="h-3 w-3" />
                    {speakingMessageIndex === i ? "Speaking…" : `Hear ${companion.name}`}
                  </button>
                )}
              </div>
            </motion.div>
          ) : null,
        )}

        {streaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="mr-auto flex items-end gap-2">
            <img
              src={companion.url}
              alt=""
              aria-hidden
              className="h-10 w-10 object-contain"
            />
            <div className="rounded-2xl bg-card px-4 py-2.5 text-sm text-muted-foreground">
              {companion.name} is thinking <TypingDots />
            </div>
          </div>
        )}

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 rounded-2xl bg-destructive/10 px-4 py-2.5 text-xs text-destructive"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <form onSubmit={onSubmit} className="mt-3 flex shrink-0 items-end gap-2 border-t border-border/60 pt-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            resizeTextarea();
          }}
          onKeyDown={onKeyDown}
          placeholder={isDisabled ? "Start Ollama to chat…" : `Message ${companion.name}…`}
          disabled={isDisabled}
          rows={1}
          className="min-w-0 flex-1 resize-none rounded-2xl border border-border bg-card px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
          style={{ maxHeight: 120 }}
        />
        {streaming ? (
          <button
            type="button"
            onClick={stopGeneration}
            aria-label="Stop generating"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-destructive text-destructive-foreground transition-transform active:scale-95"
          >
            <Square className="h-3.5 w-3.5" fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={isDisabled || !input.trim()}
            aria-label="Send"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </form>
    </section>
  );
}
