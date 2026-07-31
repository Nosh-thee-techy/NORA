import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Check,
  Flame,
  Thermometer,
  Zap,
  Droplets,
  Camera,
  Mic,
  MessageCircle,
  Phone,
} from "lucide-react";
import { PoseGuideCamera } from "@/components/PoseGuideCamera";
import { useNora } from "@/store/nora";
import { avatarById } from "@/lib/avatars";
import { speakText, stopSpeaking, canSpeak } from "@/lib/speech";
import { canListen, interpretYesNo, listenOnce } from "@/lib/listen";
import {
  buildCrisisMessage,
  buildSmsUrl,
  buildWhatsAppUrl,
  openExternal,
} from "@/lib/dispatch";

const BREATH_STEPS = [
  { label: "Breathe in", seconds: 4 },
  { label: "Hold", seconds: 7 },
  { label: "Breathe out", seconds: 8 },
];

const CHECKS = [
  {
    id: "fever",
    label: "Fever?",
    voice: "Do you have a fever right now? Say yes or no.",
    icon: Thermometer,
  },
  {
    id: "sharp",
    label: "Unilateral Sharp Pain?",
    voice: "Is the pain sharp on only one side? Say yes or no.",
    icon: Zap,
  },
  {
    id: "vomiting",
    label: "Heavy Vomiting?",
    voice: "Are you vomiting heavily? Say yes or no.",
    icon: Droplets,
  },
] as const;

type TriagePhase = "idle" | "speaking" | "listening" | "done";

export function SosScreen({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile } = useNora();
  const companion = avatarById(profile.avatarId);
  const [step, setStep] = useState(0);
  const [flags, setFlags] = useState<string[]>([]);
  const [poses, setPoses] = useState(false);
  const [cameraGuide, setCameraGuide] = useState(false);
  const [triagePhase, setTriagePhase] = useState<TriagePhase>("idle");
  const [triageIndex, setTriageIndex] = useState(0);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [dispatched, setDispatched] = useState<"whatsapp" | "sms" | null>(null);
  const triageRun = useRef(0);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setFlags([]);
    setPoses(false);
    setTriagePhase("idle");
    setTriageIndex(0);
    setVoiceNote(null);
    setDispatched(null);
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const run = () => {
      timer = setTimeout(() => {
        i = (i + 1) % BREATH_STEPS.length;
        setStep(i);
        run();
      }, (BREATH_STEPS[i]?.seconds ?? 4) * 1000);
    };
    run();
    return () => {
      clearTimeout(timer);
      stopSpeaking();
      triageRun.current += 1;
    };
  }, [open]);

  const message = buildCrisisMessage(flags.map((id) => CHECKS.find((c) => c.id === id)?.label ?? id));
  const whatsappUrl = buildWhatsAppUrl(profile, message);
  const smsUrl = buildSmsUrl(profile, message);

  const askQuestion = async (index: number, runId: number) => {
    const check = CHECKS[index];
    if (!check || runId !== triageRun.current) return;
    setTriageIndex(index);
    setTriagePhase("speaking");
    setVoiceNote(check.voice);

    await new Promise<void>((resolve) => {
      if (!canSpeak()) {
        resolve();
        return;
      }
      speakText(check.voice, { rate: 0.95, onEnd: () => resolve(), onError: () => resolve() });
    });

    if (runId !== triageRun.current) return;

    if (!canListen()) {
      setVoiceNote("Voice listen unavailable — tap the screening buttons below.");
      setTriagePhase("done");
      return;
    }

    setTriagePhase("listening");
    setVoiceNote("Listening… say yes or no");
    const { transcript, error } = await listenOnce({ timeoutMs: 7000 });
    if (runId !== triageRun.current) return;

    const answer = interpretYesNo(transcript);
    if (answer === "yes") {
      setFlags((f) => (f.includes(check.id) ? f : [...f, check.id]));
      setVoiceNote(`Heard “${transcript || "yes"}” — noted.`);
    } else if (answer === "no") {
      setFlags((f) => f.filter((x) => x !== check.id));
      setVoiceNote(`Heard “${transcript || "no"}”.`);
    } else {
      setVoiceNote(
        error === "unsupported"
          ? "Mic triage unavailable — use the buttons."
          : "I didn’t catch that — you can tap the buttons.",
      );
    }

    const next = index + 1;
    if (next < CHECKS.length) {
      await askQuestion(next, runId);
    } else {
      setTriagePhase("done");
      const closing =
        "Screening complete. If you want, I can open WhatsApp or SMS to your emergency contact.";
      setVoiceNote(closing);
      speakText(closing, { rate: 0.95 });
    }
  };

  const startVoiceTriage = () => {
    stopSpeaking();
    triageRun.current += 1;
    const runId = triageRun.current;
    setFlags([]);
    setTriagePhase("speaking");
    const intro =
      "I'm Nora's Guardian Orb. Stay with your breath. I'll ask three yes or no questions.";
    setVoiceNote(intro);
    if (!canSpeak()) {
      void askQuestion(0, runId);
      return;
    }
    speakText(intro, {
      rate: 0.95,
      onEnd: () => {
        void askQuestion(0, runId);
      },
      onError: () => {
        void askQuestion(0, runId);
      },
    });
  };

  const dispatchWhatsApp = () => {
    if (!whatsappUrl) {
      setVoiceNote("Add a WhatsApp or emergency number in onboarding to dispatch.");
      return;
    }
    openExternal(whatsappUrl);
    setDispatched("whatsapp");
    speakText("Opening WhatsApp with your crisis message.");
  };

  const dispatchSms = () => {
    if (!smsUrl) {
      setVoiceNote("Add an emergency contact number in onboarding to send SMS.");
      return;
    }
    openExternal(smsUrl);
    setDispatched("sms");
    speakText("Opening Messages with your crisis text.");
  };

  const breathScale =
    step === 0 ? [1, 1.12] : step === 1 ? [1.12, 1.12] : [1.12, 0.94];
  const breathDuration = BREATH_STEPS[step]?.seconds ?? 4;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-mode="sos"
          data-phase="menstrual"
          data-avatar={profile.avatarId}
          className="fixed inset-0 z-[60] overflow-y-auto bg-background px-5 py-6 text-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="mx-auto flex max-w-md flex-col items-center">
            <div className="flex w-full items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-bold text-destructive">
                <Flame className="h-4 w-4" /> Crisis Flare · Guardian Orb
              </p>
              <button
                onClick={onClose}
                className="rounded-full bg-muted p-2"
                aria-label="Exit SOS mode"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative mt-4 grid place-items-center">
              <motion.div
                aria-hidden
                className="absolute h-72 w-72 rounded-full bg-destructive/30 blur-3xl"
                animate={{ opacity: [0.35, 0.75, 0.35], scale: breathScale }}
                transition={{ duration: breathDuration, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* Guardian Orb ring */}
              <motion.div
                aria-hidden
                className="absolute h-60 w-60 rounded-full border-2 border-destructive/50 sm:h-72 sm:w-72"
                animate={{ scale: breathScale, opacity: [0.45, 0.9, 0.45] }}
                transition={{ duration: breathDuration, ease: "easeInOut", repeat: Infinity }}
              />
              <motion.img
                key={`${companion.id}-${step}`}
                src={companion.url}
                alt={companion.name}
                animate={{ scale: breathScale }}
                transition={{ duration: breathDuration, ease: "easeInOut" }}
                className="relative h-56 w-56 object-contain drop-shadow-[0_0_40px_color-mix(in_oklab,var(--sos-glow)_55%,transparent)] sm:h-64 sm:w-64"
              />
            </div>

            <motion.p
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-1 text-2xl font-extrabold"
            >
              {BREATH_STEPS[step]?.label}
            </motion.p>
            <p className="text-sm text-muted-foreground">
              4-7-8 with {companion.name} · Guardian Orb. You are safe.
            </p>

            <button
              type="button"
              onClick={startVoiceTriage}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive py-3.5 text-sm font-bold text-destructive-foreground shadow-[0_0_34px_-8px_var(--sos-glow)]"
            >
              <Mic className="h-5 w-5" />
              {triagePhase === "idle" || triagePhase === "done"
                ? "Start voice-first triage"
                : triagePhase === "listening"
                  ? `Listening · ${CHECKS[triageIndex]?.label ?? ""}`
                  : "Speaking…"}
            </button>
            {voiceNote && (
              <p className="mt-2 w-full rounded-2xl bg-card px-4 py-3 text-xs font-semibold text-muted-foreground">
                {voiceNote}
              </p>
            )}

            <div className="mt-4 grid w-full grid-cols-2 gap-2">
              <button
                type="button"
                onClick={dispatchWhatsApp}
                className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-xs font-bold"
              >
                <MessageCircle className="h-4 w-4 text-destructive" />
                WhatsApp dispatch
              </button>
              <button
                type="button"
                onClick={dispatchSms}
                className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-xs font-bold"
              >
                <Phone className="h-4 w-4 text-destructive" />
                SMS dispatch
              </button>
            </div>
            <div className="mt-2 flex w-full items-center gap-3 rounded-3xl bg-card p-4">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-destructive text-destructive-foreground">
                <Check className="h-4 w-4" />
              </span>
              <p className="text-sm font-semibold">
                {dispatched === "whatsapp"
                  ? "WhatsApp opened with your crisis message"
                  : dispatched === "sms"
                    ? "SMS composer opened with your crisis message"
                    : whatsappUrl || smsUrl
                      ? "Ready to open WhatsApp or SMS to your contact"
                      : "Add emergency / WhatsApp numbers in onboarding to dispatch"}
              </p>
            </div>

            <div className="mt-5 w-full space-y-2">
              <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                Emergency screening
              </p>
              {CHECKS.map((c) => {
                const on = flags.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() =>
                      setFlags((f) =>
                        f.includes(c.id) ? f.filter((x) => x !== c.id) : [...f, c.id],
                      )
                    }
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                      on
                        ? "border-destructive bg-destructive/20 text-foreground"
                        : "border-border bg-card"
                    }`}
                  >
                    <c.icon className="h-4 w-4 text-destructive" />
                    {c.label}
                    {on && <Check className="ml-auto h-4 w-4 text-destructive" />}
                  </button>
                );
              })}
              {flags.length > 0 && (
                <p className="rounded-2xl bg-destructive/15 px-4 py-3 text-xs text-foreground">
                  Red flags noted. If these worsen, seek urgent care — this is logged in
                  your health story.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setCameraGuide(true)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 py-3.5 text-sm font-bold text-foreground"
            >
              <Camera className="h-5 w-5 text-destructive" />
              Open Camera Pose & Breath Guide
            </button>

            <button
              type="button"
              onClick={() => setPoses((p) => !p)}
              className="mt-2 w-full rounded-2xl border border-border bg-card py-3 text-sm font-bold"
            >
              {poses ? "Hide pose list" : "Show pose list without camera"}
            </button>

            <AnimatePresence>
              {poses && (
                <motion.ol
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 w-full space-y-2 overflow-hidden text-sm"
                >
                  {[
                    "Child's pose with knees wide — 90 seconds",
                    "Supported reclined butterfly, pillow under hips — 2 minutes",
                    "Left-side lying with knee pillow — 3 minutes",
                  ].map((p, i) => (
                    <li key={p} className="rounded-2xl bg-card px-4 py-3">
                      <span className="mr-2 font-bold text-destructive">{i + 1}.</span>
                      {p}
                    </li>
                  ))}
                </motion.ol>
              )}
            </AnimatePresence>

            <button onClick={onClose} className="mt-6 pb-6 text-sm text-muted-foreground underline">
              I'm feeling steadier — exit
            </button>
          </div>

          <PoseGuideCamera open={cameraGuide} onClose={() => setCameraGuide(false)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
