import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera,
  CameraOff,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { avatarById } from "@/lib/avatars";
import { useNora } from "@/store/nora";
import { canSpeak, speakText, stopSpeaking } from "@/lib/speech";

type PoseDef = {
  id: string;
  title: string;
  durationSec: number;
  tip: string;
  /** Spoken + on-screen setup coach */
  steps: string[];
  holdCue: string;
  joints: readonly (readonly [number, number])[];
  bones: readonly (readonly [number, number])[];
};

const POSES: PoseDef[] = [
  {
    id: "childs-pose",
    title: "Child’s Pose",
    durationSec: 90,
    tip: "Knees wide, forehead down, hips toward heels. Soften your belly into the mat.",
    steps: [
      "Find a soft mat or folded towel. Kneel down.",
      "Open your knees wider than your hips so your belly has space.",
      "Sit your hips back toward your heels. Stop if anything pinches.",
      "Walk your hands forward and rest your forehead on the floor or a pillow.",
      "Soften your shoulders and belly. We will breathe here together.",
    ],
    holdCue: "Stay folded. Long exhales. Let the pelvis feel heavy.",
    joints: [
      [100, 92],
      [100, 120],
      [62, 150],
      [138, 150],
      [48, 200],
      [152, 200],
      [70, 240],
      [130, 240],
      [100, 70],
    ],
    bones: [
      [0, 1],
      [1, 2],
      [1, 3],
      [2, 4],
      [3, 5],
      [4, 6],
      [5, 7],
      [0, 8],
    ],
  },
  {
    id: "butterfly",
    title: "Supported Butterfly",
    durationSec: 120,
    tip: "Soles together, pillow under hips if needed. Breathe into the pelvic bowl.",
    steps: [
      "Sit tall on the floor. Place a pillow under your seat if that helps.",
      "Bring the soles of your feet together and let your knees fall open.",
      "Support each knee with a cushion if they feel high or strained.",
      "Rest your hands on your ankles or thighs. Soften your jaw.",
      "Breathe low into the belly and pelvic bowl. No forcing the stretch.",
    ],
    holdCue: "Easy knees. Soft belly breaths. Stay supported.",
    joints: [
      [100, 70],
      [100, 120],
      [70, 100],
      [130, 100],
      [55, 160],
      [145, 160],
      [90, 210],
      [110, 210],
      [100, 48],
    ],
    bones: [
      [0, 1],
      [1, 2],
      [1, 3],
      [2, 4],
      [3, 5],
      [4, 6],
      [5, 7],
      [6, 7],
      [0, 8],
    ],
  },
  {
    id: "side-lying",
    title: "Left-Side Lying",
    durationSec: 180,
    tip: "Lie on your left side with a pillow between knees. Keep shoulders soft.",
    steps: [
      "Lie down on your left side. Put a pillow under your head.",
      "Bend both knees slightly and place a pillow between them.",
      "Stack your hips and keep your shoulders soft — no twisting hard.",
      "Rest your top hand on the floor or your belly.",
      "Breathe slowly. This pose should feel like a quiet reset.",
    ],
    holdCue: "Left side soft. Knees cushioned. Slow 4-7-8 breaths.",
    joints: [
      [70, 100],
      [110, 110],
      [50, 120],
      [130, 95],
      [150, 140],
      [170, 175],
      [140, 190],
      [160, 220],
      [48, 88],
    ],
    bones: [
      [0, 1],
      [0, 2],
      [1, 3],
      [1, 4],
      [4, 5],
      [1, 6],
      [6, 7],
      [0, 8],
    ],
  },
];

const BREATH = [
  { label: "Breathe in", seconds: 4, speak: "Breathe in" },
  { label: "Hold", seconds: 7, speak: "Hold" },
  { label: "Breathe out", seconds: 8, speak: "Breathe out slowly" },
];

export function PoseGuideCamera({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { profile } = useNora();
  const companion = avatarById(profile.avatarId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const coachRun = useRef(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [poseIndex, setPoseIndex] = useState(0);
  const [remaining, setRemaining] = useState<number>(POSES[0]!.durationSec);
  const [breathStep, setBreathStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [matchScore, setMatchScore] = useState(0);
  const [depthPulse, setDepthPulse] = useState(0);
  const [coachStep, setCoachStep] = useState(0);
  const [phase, setPhase] = useState<"setup" | "hold">("setup");
  const [voiceOn, setVoiceOn] = useState(true);
  const [imgBroken, setImgBroken] = useState(false);

  const pose = POSES[poseIndex]!;

  // Start / stop camera
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCameraError(null);
    setCameraReady(false);
    setPoseIndex(0);
    setRemaining(POSES[0]!.durationSec);
    setRunning(false);
    setMatchScore(0);
    setCoachStep(0);
    setPhase("setup");
    setImgBroken(false);
    prevFrameRef.current = null;
    coachRun.current += 1;

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera is not supported in this browser.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          setCameraReady(true);
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Could not open the camera. Check permissions and try again.";
        setCameraError(message);
        // Still allow coaching without camera
        setCameraReady(true);
      }
    }

    void start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      stopSpeaking();
      coachRun.current += 1;
    };
  }, [open]);

  // Voice + on-screen setup coach when pose changes
  useEffect(() => {
    if (!open) return;
    const runId = ++coachRun.current;
    setPhase("setup");
    setCoachStep(0);
    setRunning(false);
    setRemaining(pose.durationSec);
    setMatchScore(0);

    const steps = pose.steps;
    let stepIdx = 0;

    const speakStep = () => {
      if (runId !== coachRun.current) return;
      if (stepIdx >= steps.length) {
        setPhase("hold");
        setRunning(true);
        const hold = `${pose.title} is set. ${pose.holdCue}`;
        if (voiceOn && canSpeak()) speakText(hold, { rate: 0.92 });
        return;
      }
      setCoachStep(stepIdx);
      const line = `Step ${stepIdx + 1}. ${steps[stepIdx]}`;
      if (voiceOn && canSpeak()) {
        speakText(line, {
          rate: 0.92,
          onEnd: () => {
            if (runId !== coachRun.current) return;
            stepIdx += 1;
            window.setTimeout(speakStep, 650);
          },
          onError: () => {
            stepIdx += 1;
            window.setTimeout(speakStep, 900);
          },
        });
      } else {
        window.setTimeout(() => {
          if (runId !== coachRun.current) return;
          stepIdx += 1;
          speakStep();
        }, 2200);
      }
    };

    const intro = `${companion.name} here. Let's set up ${pose.title}. Follow each step.`;
    if (voiceOn && canSpeak()) {
      speakText(intro, {
        rate: 0.92,
        onEnd: () => window.setTimeout(speakStep, 400),
        onError: () => window.setTimeout(speakStep, 400),
      });
    } else {
      window.setTimeout(speakStep, 500);
    }

    return () => {
      coachRun.current += 1;
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, poseIndex, voiceOn]);

  // Lightweight stillness → match confidence (during hold)
  useEffect(() => {
    if (!open || !cameraReady || phase !== "hold") return;
    let raf = 0;
    const sample = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2 && !cameraError) {
        const w = 64;
        const h = 48;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          const { data } = ctx.getImageData(0, 0, w, h);
          const prev = prevFrameRef.current;
          if (prev && prev.length === data.length) {
            let diff = 0;
            for (let i = 0; i < data.length; i += 16) {
              diff += Math.abs(data[i]! - prev[i]!);
            }
            const motion = Math.min(1, diff / (w * h * 4));
            setMatchScore((s) => {
              const target = motion < 0.08 ? Math.min(100, s + 1.2) : Math.max(0, s - motion * 18);
              return Math.round(target);
            });
          }
          prevFrameRef.current = new Uint8ClampedArray(data);
        }
      }
      setDepthPulse((p) => (p + 1) % 360);
      raf = requestAnimationFrame(sample);
    };
    raf = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(raf);
  }, [open, cameraReady, poseIndex, phase, cameraError]);

  // Pose countdown (hold phase only)
  useEffect(() => {
    if (!open || !running || phase !== "hold") return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setPoseIndex((i) => {
            const next = Math.min(i + 1, POSES.length - 1);
            if (next === i) {
              setRunning(false);
              if (voiceOn) {
                speakText("Beautiful work. You can rest or exit when ready.", { rate: 0.92 });
              }
            }
            return next;
          });
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [open, running, phase, poseIndex, voiceOn]);

  // Breath cycle + optional spoken cues during hold
  useEffect(() => {
    if (!open || phase !== "hold") return;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const run = () => {
      setBreathStep(i);
      timer = setTimeout(() => {
        i = (i + 1) % BREATH.length;
        run();
      }, (BREATH[i]?.seconds ?? 4) * 1000);
    };
    run();
    return () => clearTimeout(timer);
  }, [open, phase, poseIndex]);

  const skipToHold = () => {
    coachRun.current += 1;
    stopSpeaking();
    setCoachStep(pose.steps.length - 1);
    setPhase("hold");
    setRunning(true);
    if (voiceOn) speakText(`Holding ${pose.title}. ${pose.holdCue}`, { rate: 0.92 });
  };

  const goPose = (next: number) => {
    const clamped = Math.max(0, Math.min(POSES.length - 1, next));
    setPoseIndex(clamped);
  };

  const mm = String(Math.floor(remaining / 60)).padStart(1, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const parallax = Math.sin((depthPulse * Math.PI) / 180) * 4;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex flex-col bg-black text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <header className="flex items-center justify-between gap-2 px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-red-300">
                Pose coach with {companion.name}
              </p>
              <p className="text-sm font-semibold">
                {phase === "setup" ? "Setup walkthrough" : "Hold & breathe"} · {poseIndex + 1}/
                {POSES.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setVoiceOn((v) => {
                    if (v) stopSpeaking();
                    return !v;
                  });
                }}
                className="rounded-full bg-white/10 p-2"
                aria-label={voiceOn ? "Mute coach voice" : "Enable coach voice"}
              >
                {voiceOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  onClose();
                }}
                aria-label="Close camera guide"
                className="rounded-full bg-white/10 p-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="relative mx-4 min-h-0 flex-1 overflow-hidden rounded-3xl bg-zinc-900">
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover scale-x-[-1]"
            />
            <canvas ref={canvasRef} className="hidden" aria-hidden />

            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 grid place-items-center bg-black/70 text-sm">
                <span className="inline-flex items-center gap-2">
                  <Camera className="h-4 w-4 animate-pulse" />
                  Starting camera…
                </span>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950 px-6 text-center">
                <CameraOff className="h-8 w-8 text-red-300" />
                <p className="text-sm font-semibold">Camera unavailable — coaching continues</p>
                <p className="text-xs text-white/70">{cameraError}</p>
              </div>
            )}

            {/* Pose wireframe during hold */}
            {phase === "hold" && (
              <svg
                aria-hidden
                viewBox="0 0 200 280"
                className="pointer-events-none absolute inset-0 m-auto h-[72%] w-auto"
                style={{ opacity: 0.35 + matchScore / 250 }}
              >
                <defs>
                  <linearGradient id="pose-depth" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fda4af" />
                    <stop offset="100%" stopColor="#fff" />
                  </linearGradient>
                </defs>
                {pose.bones.map(([a, b], i) => {
                  const ja = pose.joints[a]!;
                  const jb = pose.joints[b]!;
                  return (
                    <line
                      key={`b-${i}`}
                      x1={ja[0] + parallax}
                      y1={ja[1]}
                      x2={jb[0] - parallax * 0.6}
                      y2={jb[1]}
                      stroke="url(#pose-depth)"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  );
                })}
                {pose.joints.map(([x, y], i) => (
                  <circle
                    key={`j-${i}`}
                    cx={x + (i % 2 === 0 ? parallax : -parallax)}
                    cy={y}
                    r={i === 8 ? 14 : 5}
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                  />
                ))}
              </svg>
            )}

            {/* Companion coach card — always visible */}
            <div className="absolute right-3 top-3 flex max-w-[46%] flex-col items-center rounded-2xl bg-black/65 px-2 py-2 backdrop-blur-sm">
              {!imgBroken ? (
                <img
                  src={companion.url}
                  alt={companion.name}
                  onError={() => setImgBroken(true)}
                  className="h-24 w-24 object-contain sm:h-28 sm:w-28"
                />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-full bg-white/10 text-xs font-bold sm:h-28 sm:w-28">
                  {companion.name.slice(0, 1)}
                </div>
              )}
              <p className="mt-1 text-center text-[11px] font-bold">{companion.name}</p>
              <p className="text-center text-[10px] text-white/70">your pose coach</p>
            </div>

            {phase === "hold" && (
              <div className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-[11px] font-bold">
                Stillness {matchScore}%
              </div>
            )}

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-4 pb-4 pt-20">
              <p className="text-lg font-extrabold">{pose.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/75">{pose.tip}</p>

              {phase === "setup" ? (
                <ol className="mt-3 max-h-36 space-y-1.5 overflow-y-auto text-xs">
                  {pose.steps.map((s, i) => (
                    <li
                      key={s}
                      className={`rounded-xl px-3 py-2 font-semibold ${
                        i === coachStep
                          ? "bg-red-600 text-white"
                          : i < coachStep
                            ? "bg-white/15 text-white/80"
                            : "bg-white/5 text-white/45"
                      }`}
                    >
                      <span className="mr-1.5 font-extrabold">{i + 1}.</span>
                      {s}
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/10 px-3 py-2 text-xs font-bold">
                  <span>{BREATH[breathStep]?.label}</span>
                  <span className="tabular-nums text-base">
                    {mm}:{ss}
                  </span>
                  <span>{running ? "Holding" : "Done"}</span>
                </div>
              )}

              {phase === "setup" && (
                <button
                  type="button"
                  onClick={skipToHold}
                  className="mt-3 w-full rounded-2xl bg-white/15 py-2.5 text-xs font-bold"
                >
                  I’m in position — start hold timer
                </button>
              )}
            </div>
          </div>

          <footer className="flex items-center gap-2 px-4 py-4">
            <button
              type="button"
              disabled={poseIndex === 0}
              onClick={() => goPose(poseIndex - 1)}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-2xl bg-white/10 py-3 text-sm font-bold disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (phase === "setup") skipToHold();
                else setRunning((r) => !r);
              }}
              className="inline-flex flex-1 items-center justify-center rounded-2xl bg-red-600 py-3 text-sm font-bold"
            >
              {phase === "setup" ? "Skip to hold" : running ? "Pause" : "Resume"}
            </button>
            <button
              type="button"
              disabled={poseIndex >= POSES.length - 1}
              onClick={() => goPose(poseIndex + 1)}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-2xl bg-white/10 py-3 text-sm font-bold disabled:opacity-40"
            >
              Next pose
              <ChevronRight className="h-4 w-4" />
            </button>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
