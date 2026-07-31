import { motion } from "motion/react";
import { useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Phase, SymptomId } from "@/lib/cycle";

type LunaProps = {
  phase: Phase;
  energy: number;
  symptoms: SymptomId[];
  size?: number;
  sos?: boolean;
  /** Permanent glow from 3-month high-risk pattern recognition */
  resilience?: boolean;
  /** Soft rest state for post-op recovery */
  recovery?: boolean;
  /** Allow vertical drag on Luna to set energy */
  energyInteractive?: boolean;
  onEnergyChange?: (energy: number) => void;
  onPoke?: () => void;
};

const SHAPES: Record<Phase, string> = {
  follicular:
    "M100 18 C138 62 158 96 158 122 C158 155 132 178 100 178 C68 178 42 155 42 122 C42 96 62 62 100 18 Z",
  ovulation:
    "M100 16 C110 66 134 90 184 100 C134 110 110 134 100 184 C90 134 66 110 16 100 C66 90 90 66 100 16 Z",
  luteal:
    "M62 148 C34 148 20 128 26 108 C31 90 48 82 60 84 C64 58 88 44 110 50 C128 55 138 70 140 84 C166 80 182 98 178 118 C174 138 156 148 138 148 Z",
  menstrual:
    "M100 26 C142 26 174 60 174 102 C174 146 142 176 100 176 C58 176 26 146 26 102 C26 60 58 26 100 26 Z",
};

const EYE_Y: Record<Phase, number> = {
  follicular: 116,
  ovulation: 96,
  luteal: 104,
  menstrual: 96,
};

export function Luna({
  phase,
  energy,
  symptoms,
  size = 260,
  sos = false,
  resilience = false,
  recovery = false,
  energyInteractive = false,
  onEnergyChange,
  onPoke,
}: LunaProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const fillId = `luna-fill-${uid}`;
  const blurId = `luna-blur-${uid}`;
  const flameId = `luna-flame-${uid}`;
  const [wobble, setWobble] = useState(0);
  const dragRef = useRef<{ startY: number; startEnergy: number } | null>(null);

  const bloated = symptoms.includes("endo-belly");
  const inPain =
    symptoms.includes("cramps") || symptoms.includes("leg-pain") || sos;
  const tired = bloated || symptoms.includes("nausea") || energy < 35;
  const guardian = sos || (phase === "menstrual" && inPain);

  const scale = useMemo(
    () => 0.9 + energy / 320 + (bloated ? 0.22 : 0) + (guardian ? 0.08 : 0),
    [energy, bloated, guardian],
  );

  const bodyPath = useMemo(() => {
    if (!bloated) return SHAPES[phase];
    // Inflated “Endo Belly” silhouette — wider midsection on any phase
    return "M100 22 C148 28 176 68 178 112 C180 156 146 182 100 184 C54 182 20 156 22 112 C24 68 52 28 100 22 Z";
  }, [bloated, phase]);

  const eyeY = EYE_Y[phase];
  const pulse = sos ? [1, 1.14, 1.14, 1] : recovery ? [1, 1.03, 1] : [1, 1.05, 1];
  const pulseDuration = sos ? 19 : phase === "menstrual" ? 3.4 : inPain ? 1.6 : 4.2;

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!energyInteractive || !onEnergyChange) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startEnergy: energy };
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!dragRef.current || !onEnergyChange) return;
    const delta = dragRef.current.startY - e.clientY;
    const next = Math.max(0, Math.min(100, dragRef.current.startEnergy + delta / 2));
    onEnergyChange(Math.round(next));
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <motion.button
      type="button"
      aria-label="Nora companion. Drag up/down to tune energy, tap to interact."
      onClick={() => {
        if (dragRef.current) return;
        setWobble((w) => w + 1);
        onPoke?.();
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="relative grid touch-none place-items-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
      style={{ width: size, height: size }}
      whileTap={{ scale: energyInteractive ? 1 : 0.94 }}
    >
      {recovery && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-[-10%] bottom-[6%] h-[38%] rounded-[100%] bg-white/70 blur-md"
          animate={{ opacity: [0.55, 0.85, 0.55], scaleX: [1, 1.04, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-[-28%] rounded-full ambient-glow"
        animate={{ opacity: sos ? [0.45, 0.95, 0.45] : [0.55, 0.9, 0.55], scale: pulse }}
        transition={{ duration: pulseDuration, repeat: Infinity, ease: "easeInOut" }}
      />

      {resilience && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute right-[18%] top-[16%] h-4 w-4 rounded-full bg-amber-300 shadow-[0_0_18px_6px_rgba(252,211,77,0.65)]"
          animate={{ opacity: [0.55, 1, 0.55], scale: [0.9, 1.15, 0.9] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          title="Resilience glow"
        />
      )}

      {recovery &&
        [0, 1, 2, 3, 4, 5].map((i) => (
          <motion.span
            key={`heal-${i}`}
            aria-hidden
            className="pointer-events-none absolute h-2 w-2 rounded-full bg-sky-200/90"
            style={{ left: `${20 + i * 12}%`, bottom: "22%" }}
            animate={{ y: [0, -36 - i * 4, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 3.2 + i * 0.2, repeat: Infinity, delay: i * 0.35 }}
          />
        ))}

      <motion.svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className="relative"
        style={{ color: guardian ? "var(--menstrual)" : "var(--phase)" }}
        key={wobble}
        initial={{ rotate: 0 }}
        animate={
          phase === "luteal" && !sos
            ? { rotate: [0, -2, 2, -1.5, 1, 0], x: [0, -2, 2, -1, 0], scale }
            : { rotate: [0, -4, 3, -2, 0], scale }
        }
        transition={
          phase === "luteal" && !sos
            ? { duration: 3.6, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.7, ease: "easeOut" }
        }
      >
        <defs>
          <radialGradient id={fillId} cx="42%" cy="34%">
            <stop offset="0%" stopColor="white" stopOpacity="0.55" />
            <stop offset="55%" stopColor="currentColor" stopOpacity="0.95" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.6" />
          </radialGradient>
          <filter id={blurId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <linearGradient id={flameId} x1="0" x2="0" y1="1" y2="0">
            <stop offset="0%" stopColor="#ff6b3d" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffd27a" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {guardian &&
          [0, 1, 2, 3, 4].map((i) => (
            <motion.path
              key={`flame-${i}`}
              d={`M${70 + i * 14} 168 Q${78 + i * 14} 140 ${74 + i * 14} 120 Q${82 + i * 14} 145 ${78 + i * 14} 168 Z`}
              fill={`url(#${flameId})`}
              animate={{ y: [0, -6, 0], opacity: [0.45, 0.9, 0.45] }}
              transition={{ duration: 1.1 + i * 0.12, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}

        <path
          d={bodyPath}
          fill={`url(#${fillId})`}
          filter={`url(#${blurId})`}
          opacity={0.55}
        />
        <motion.path
          d={bodyPath}
          fill={`url(#${fillId})`}
          animate={{
            scale: sos ? [1, 1.06, 1.06, 1] : bloated ? [1, 1.05, 1] : [1, 1.03, 1],
          }}
          style={{ transformOrigin: "100px 100px" }}
          transition={{ duration: pulseDuration, repeat: Infinity, ease: "easeInOut" }}
        />

        <g fill="var(--phase-deep)" opacity={0.85}>
          {tired ? (
            <>
              <path
                d={`M78 ${eyeY} q9 -8 18 0`}
                stroke="var(--phase-deep)"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d={`M104 ${eyeY} q9 -8 18 0`}
                stroke="var(--phase-deep)"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
            </>
          ) : (
            <>
              <motion.ellipse
                cx="87"
                cy={eyeY}
                rx="5"
                ry="7"
                style={{ transformOrigin: `87px ${eyeY}px` }}
                animate={{ scaleY: [1, 0.15, 1] }}
                transition={{ duration: 0.35, repeat: Infinity, repeatDelay: 4.5 }}
              />
              <motion.ellipse
                cx="113"
                cy={eyeY}
                rx="5"
                ry="7"
                style={{ transformOrigin: `113px ${eyeY}px` }}
                animate={{ scaleY: [1, 0.15, 1] }}
                transition={{ duration: 0.35, repeat: Infinity, repeatDelay: 4.5 }}
              />
            </>
          )}
          <path
            d={
              inPain
                ? `M88 ${eyeY + 22} q12 -8 24 0`
                : `M88 ${eyeY + 18} q12 10 24 0`
            }
            stroke="var(--phase-deep)"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        <ellipse cx="72" cy={eyeY + 14} rx="8" ry="5" fill="white" opacity="0.35" />
        <ellipse cx="128" cy={eyeY + 14} rx="8" ry="5" fill="white" opacity="0.35" />
      </motion.svg>

      {phase === "ovulation" &&
        !sos &&
        [0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            aria-hidden
            className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-phase"
            style={{
              left: `${16 + i * 17}%`,
              bottom: "18%",
              animation: `float-sparkle ${2.4 + i * 0.4}s ease-in-out ${i * 0.35}s infinite`,
            }}
          />
        ))}

      {energyInteractive && (
        <span className="pointer-events-none absolute bottom-1 rounded-full bg-card/80 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
          Drag ↑ energy · ↓ calm
        </span>
      )}
    </motion.button>
  );
}
