import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, CameraOff, ChevronLeft, ChevronRight, X } from "lucide-react";
import { avatarById } from "@/lib/avatars";
import { useNora } from "@/store/nora";

const POSES = [
  {
    id: "childs-pose",
    title: "Child’s Pose",
    durationSec: 90,
    tip: "Knees wide, forehead down, hips toward heels. Soften your belly into the mat.",
  },
  {
    id: "butterfly",
    title: "Supported Butterfly",
    durationSec: 120,
    tip: "Soles together, pillow under hips if needed. Breathe into the pelvic bowl.",
  },
  {
    id: "side-lying",
    title: "Left-Side Lying",
    durationSec: 180,
    tip: "Lie on your left side with a pillow between knees. Keep shoulders soft.",
  },
] as const;

const BREATH = [
  { label: "Breathe in", seconds: 4 },
  { label: "Hold", seconds: 7 },
  { label: "Breathe out", seconds: 8 },
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
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [poseIndex, setPoseIndex] = useState(0);
  const [remaining, setRemaining] = useState(POSES[0].durationSec);
  const [breathStep, setBreathStep] = useState(0);
  const [running, setRunning] = useState(true);

  const pose = POSES[poseIndex]!;

  // Start / stop camera
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCameraError(null);
    setCameraReady(false);
    setPoseIndex(0);
    setRemaining(POSES[0].durationSec);
    setRunning(true);

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
      }
    }

    void start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  // Pose countdown
  useEffect(() => {
    if (!open || !running || !cameraReady) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setPoseIndex((i) => {
            const next = Math.min(i + 1, POSES.length - 1);
            if (next !== i) setRemaining(POSES[next]!.durationSec);
            else setRunning(false);
            return next;
          });
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [open, running, cameraReady, poseIndex]);

  // Breath cycle
  useEffect(() => {
    if (!open) return;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const run = () => {
      timer = setTimeout(() => {
        i = (i + 1) % BREATH.length;
        setBreathStep(i);
        run();
      }, (BREATH[i]?.seconds ?? 4) * 1000);
    };
    run();
    return () => clearTimeout(timer);
  }, [open]);

  const goPose = (next: number) => {
    const clamped = Math.max(0, Math.min(POSES.length - 1, next));
    setPoseIndex(clamped);
    setRemaining(POSES[clamped]!.durationSec);
    setRunning(true);
  };

  const mm = String(Math.floor(remaining / 60)).padStart(1, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex flex-col bg-black text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <header className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-red-300">
                Camera pose guide
              </p>
              <p className="text-sm font-semibold">
                Pose {poseIndex + 1} of {POSES.length}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close camera guide"
              className="rounded-full bg-white/10 p-2"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="relative mx-4 min-h-0 flex-1 overflow-hidden rounded-3xl bg-zinc-900">
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover scale-x-[-1]"
            />

            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 grid place-items-center bg-black/70 text-sm">
                <span className="inline-flex items-center gap-2">
                  <Camera className="h-4 w-4 animate-pulse" />
                  Starting camera…
                </span>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center">
                <CameraOff className="h-8 w-8 text-red-300" />
                <p className="text-sm font-semibold">Camera unavailable</p>
                <p className="text-xs text-white/70">{cameraError}</p>
                <p className="text-xs text-white/60">
                  You can still follow the poses without video — use Next to continue.
                </p>
              </div>
            )}

            {/* Wireframe guide overlay */}
            <svg
              aria-hidden
              viewBox="0 0 200 280"
              className="pointer-events-none absolute inset-0 m-auto h-[70%] w-auto opacity-40"
            >
              <ellipse cx="100" cy="48" rx="18" ry="22" fill="none" stroke="white" strokeWidth="2" />
              <path
                d="M100 70 L100 150 M100 90 L60 120 M100 90 L140 120 M100 150 L70 220 M100 150 L130 220"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-4 pb-4 pt-16">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-extrabold">{pose.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/75">{pose.tip}</p>
                </div>
                <img
                  src={companion.url}
                  alt=""
                  aria-hidden
                  className="h-14 w-14 shrink-0 object-contain"
                />
              </div>

              <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/10 px-3 py-2 text-xs font-bold">
                <span>{BREATH[breathStep]?.label}</span>
                <span className="tabular-nums text-base">
                  {mm}:{ss}
                </span>
                <span>
                  {running ? "Hold the pose" : "Done"}
                </span>
              </div>
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
              onClick={() => setRunning((r) => !r)}
              className="inline-flex flex-1 items-center justify-center rounded-2xl bg-red-600 py-3 text-sm font-bold"
            >
              {running ? "Pause" : "Resume"}
            </button>
            <button
              type="button"
              disabled={poseIndex >= POSES.length - 1}
              onClick={() => goPose(poseIndex + 1)}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-2xl bg-white/10 py-3 text-sm font-bold disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
