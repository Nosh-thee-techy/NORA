/** Browser TTS helpers for companion voice replies. */

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopSpeaking(): void {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
}

export function speakText(
  text: string,
  opts?: {
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: () => void;
  },
): void {
  if (!canSpeak() || !text.trim()) {
    opts?.onEnd?.();
    return;
  }

  stopSpeaking();

  const utterance = new SpeechSynthesisUtterance(cleanForSpeech(text));
  utterance.rate = opts?.rate ?? 1;
  utterance.pitch = opts?.pitch ?? 1.05;

  const pickVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => /en(-|_)?(US|GB|AU)?/i.test(v.lang) && /female|samantha|victoria|karen|moira|zira/i.test(v.name)) ??
      voices.find((v) => /^en/i.test(v.lang));
    if (preferred) utterance.voice = preferred;
  };

  pickVoice();
  // Chrome loads voices async
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      pickVoice();
    };
  }

  utterance.onstart = () => opts?.onStart?.();
  utterance.onend = () => opts?.onEnd?.();
  utterance.onerror = () => opts?.onError?.() ?? opts?.onEnd?.();

  window.speechSynthesis.speak(utterance);
}

function cleanForSpeech(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`+/g, "")
    .replace(/[#_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
