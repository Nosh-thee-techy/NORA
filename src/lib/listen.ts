/** Browser speech recognition for SOS voice triage. */

type RecognitionCtor = new () => SpeechRecognitionLike;

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function canListen(): boolean {
  return !!getRecognitionCtor();
}

export function listenOnce(opts?: {
  lang?: string;
  timeoutMs?: number;
}): Promise<{ transcript: string; error?: string }> {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    return Promise.resolve({ transcript: "", error: "unsupported" });
  }

  return new Promise((resolve) => {
    const recognition = new Ctor();
    recognition.lang = opts?.lang ?? "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let settled = false;
    const finish = (result: { transcript: string; error?: string }) => {
      if (settled) return;
      settled = true;
      try {
        recognition.stop();
      } catch {
        /* already stopped */
      }
      resolve(result);
    };

    const timer = window.setTimeout(
      () => finish({ transcript: "", error: "timeout" }),
      opts?.timeoutMs ?? 8000,
    );

    recognition.onresult = (ev) => {
      const transcript = String(ev.results[0]?.[0]?.transcript ?? "").trim();
      window.clearTimeout(timer);
      finish({ transcript });
    };
    recognition.onerror = (ev) => {
      window.clearTimeout(timer);
      finish({ transcript: "", error: ev.error });
    };
    recognition.onend = () => {
      window.clearTimeout(timer);
      if (!settled) finish({ transcript: "", error: "ended" });
    };

    try {
      recognition.start();
    } catch {
      window.clearTimeout(timer);
      finish({ transcript: "", error: "start-failed" });
    }
  });
}

/** Map free speech to yes / no / unknown for triage. */
export function interpretYesNo(transcript: string): "yes" | "no" | "unknown" {
  const t = transcript.toLowerCase().trim();
  if (!t) return "unknown";
  if (/\b(yes|yeah|yep|yup|true|affirmative|i am|i do|have|having)\b/.test(t)) return "yes";
  if (/\b(no|nope|nah|false|negative|not|don't|dont)\b/.test(t)) return "no";
  return "unknown";
}
