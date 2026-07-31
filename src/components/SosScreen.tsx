import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Check, Flame, Thermometer, Zap, Droplets } from "lucide-react";
import { Luna } from "@/components/Luna";
import { useNora } from "@/store/nora";

const BREATH_STEPS = [
  { label: "Breathe in", seconds: 4 },
  { label: "Hold", seconds: 7 },
  { label: "Breathe out", seconds: 8 },
];

const CHECKS = [
  { id: "fever", label: "Fever?", icon: Thermometer },
  { id: "sharp", label: "Unilateral Sharp Pain?", icon: Zap },
  { id: "vomiting", label: "Heavy Vomiting?", icon: Droplets },
];

export function SosScreen({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { energy, symptoms } = useNora();
  const [step, setStep] = useState(0);
  const [flags, setFlags] = useState<string[]>([]);
  const [poses, setPoses] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0);
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
    return () => clearTimeout(timer);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-mode="sos"
          data-phase="menstrual"
          className="fixed inset-0 z-[60] overflow-y-auto bg-background px-5 py-6 text-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="mx-auto flex max-w-md flex-col items-center">
            <div className="flex w-full items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-bold text-destructive">
                <Flame className="h-4 w-4" /> Crisis Flare Mode
              </p>
              <button
                onClick={onClose}
                className="rounded-full bg-muted p-2"
                aria-label="Exit SOS mode"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6">
              <Luna phase="menstrual" energy={energy} symptoms={symptoms} size={280} sos />
            </div>

            <motion.p
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-2xl font-extrabold"
            >
              {BREATH_STEPS[step]?.label}
            </motion.p>
            <p className="text-sm text-muted-foreground">
              4-7-8 rhythm • follow Luna's ember. You are safe.
            </p>

            <div className="mt-6 flex w-full items-center gap-3 rounded-3xl bg-card p-4">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-destructive text-destructive-foreground">
                <Check className="h-4 w-4" />
              </span>
              <p className="text-sm font-semibold">Caregiver Alert Sent via WhatsApp</p>
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
              onClick={() => setPoses((p) => !p)}
              className="mt-5 w-full rounded-2xl bg-destructive py-3.5 text-sm font-bold text-destructive-foreground shadow-[0_0_34px_-8px_var(--sos-glow)]"
            >
              Guide Me Through 3D Pelvic Relief Poses
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
