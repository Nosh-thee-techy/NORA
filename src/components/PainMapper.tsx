import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Crosshair, Trash2 } from "lucide-react";
import { useNora } from "@/store/nora";
import { Slider } from "@/components/ui/slider";

const REGIONS = [
  { id: "Lower Pelvis", cx: 50, cy: 55 },
  { id: "Lower Back", cx: 50, cy: 47 },
  { id: "Bowel Area", cx: 41, cy: 60 },
  { id: "Left Thigh", cx: 41, cy: 76 },
  { id: "Right Thigh", cx: 59, cy: 76 },
];

export function PainMapper({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { painPoints, addPainPoint, updatePainPoint, removePainPoint } = useNora();
  const [selected, setSelected] = useState<string | null>(null);
  const active = painPoints.find((p) => p.id === selected) ?? painPoints.at(-1) ?? null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-end bg-foreground/40 backdrop-blur-sm sm:place-items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-4xl bg-popover p-5 text-popover-foreground sm:rounded-4xl"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold">3D Symptom Mapper</h2>
                <p className="text-xs text-muted-foreground">
                  Tap a region to drop a glowing pain point.
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full bg-secondary p-2 text-secondary-foreground"
                aria-label="Close pain mapper"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative mt-4 overflow-hidden rounded-3xl bg-foreground/90 p-4">
              <motion.svg
                viewBox="0 0 100 120"
                className="mx-auto h-[46vh] w-auto"
                animate={{ rotateY: [-8, 8, -8] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformStyle: "preserve-3d" }}
              >
                <g
                  fill="none"
                  stroke="var(--phase)"
                  strokeOpacity="0.55"
                  strokeWidth="0.6"
                >
                  <circle cx="50" cy="12" r="7" />
                  <path d="M50 19 C40 22 36 30 36 40 L36 60 C36 66 40 68 41 74 L44 100 L47 116 M50 19 C60 22 64 30 64 40 L64 60 C64 66 60 68 59 74 L56 100 L53 116" />
                  <path d="M36 30 L26 52 L24 68 M64 30 L74 52 L76 68" />
                  {[26, 34, 42, 50, 58, 66, 74, 82, 90, 100, 110].map((y) => (
                    <path key={y} d={`M${36 - (y > 74 ? 0 : 0)} ${y} Q50 ${y + 3} 64 ${y}`} />
                  ))}
                  <path d="M50 19 L50 116" strokeDasharray="2 2" />
                </g>

                {REGIONS.map((r) => (
                  <circle
                    key={r.id}
                    cx={r.cx}
                    cy={r.cy}
                    r="6"
                    fill="var(--phase)"
                    fillOpacity="0.08"
                    stroke="var(--phase)"
                    strokeOpacity="0.35"
                    strokeWidth="0.4"
                    className="cursor-pointer"
                    onClick={() => {
                      const id = `${r.id}-${Date.now()}`;
                      addPainPoint({
                        id,
                        region: r.id,
                        x: r.cx,
                        y: r.cy,
                        intensity: 6,
                        depth: 5,
                      });
                      setSelected(id);
                    }}
                  />
                ))}

                {painPoints.map((p) => (
                  <g key={p.id} onClick={() => setSelected(p.id)} className="cursor-pointer">
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={2 + p.intensity * 0.5}
                      fill="var(--sos-glow)"
                      opacity={0.22 + p.depth * 0.05}
                    />
                    <circle cx={p.x} cy={p.y} r={1.6} fill="var(--sos-glow)" />
                  </g>
                ))}
              </motion.svg>

              <p className="mt-2 text-center text-[11px] text-background/70">
                Rotating anatomical wireframe • {painPoints.length} point
                {painPoints.length === 1 ? "" : "s"} mapped
              </p>
            </div>

            {active ? (
              <div className="mt-4 rounded-3xl bg-secondary p-4">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-sm font-bold">
                    <Crosshair className="h-4 w-4" /> {active.region}
                  </p>
                  <button
                    onClick={() => removePainPoint(active.id)}
                    className="rounded-full p-2 text-muted-foreground"
                    aria-label="Remove pain point"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <label className="mt-3 block text-xs font-semibold text-muted-foreground">
                  Intensity — {active.intensity}/10
                </label>
                <Slider
                  value={[active.intensity]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={([v]) => updatePainPoint(active.id, { intensity: v })}
                  className="mt-2"
                />

                <label className="mt-4 block text-xs font-semibold text-muted-foreground">
                  Depth — {active.depth <= 3 ? "Surface" : active.depth <= 7 ? "Mid" : "Deep internal"}
                </label>
                <Slider
                  value={[active.depth]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={([v]) => updatePainPoint(active.id, { depth: v })}
                  className="mt-2"
                />
              </div>
            ) : (
              <p className="mt-4 rounded-3xl bg-secondary p-4 text-center text-sm text-muted-foreground">
                No pain points yet — tap the pelvis, back, bowel or thighs.
              </p>
            )}

            <button
              onClick={onClose}
              className="mt-4 w-full rounded-2xl phase-gradient py-3 text-sm font-bold text-primary-foreground"
            >
              Save to today's log
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
