import { motion } from "motion/react";
import { useId, useMemo, useState } from "react";
import type { Phase, SymptomId } from "@/lib/cycle";

type LunaProps = {
  phase: Phase;
  energy: number;
  symptoms: SymptomId[];
  size?: number;
  sos?: boolean;
  onPoke?: () => void;
};

const SHAPES: Record<Phase, string> = {
  // dew-drop
  follicular:
    "M100 18 C138 62 158 96 158 122 C158 155 132 178 100 178 C68 178 42 155 42 122 C42 96 62 62 100 18 Z",
  // sparkling star
  ovulation:
    "M100 16 C110 66 134 90 184 100 C134 110 110 134 100 184 C90 134 66 110 16 100 C66 90 90 66 100 16 Z",
  // soft irregular cloud
  luteal:
    "M62 148 C34 148 20 128 26 108 C31 90 48 82 60 84 C64 58 88 44 110 50 C128 55 138 70 140 84 C166 80 182 98 178 118 C174 138 156 148 138 148 Z",
  // ember orb
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
  onPoke,
}: LunaProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const fillId = `luna-fill-${uid}`;
  const blurId = `luna-blur-${uid}`;
  const [wobble, setWobble] = useState(0);
  const bloated = symptoms.includes("endo-belly");
  const inPain = symptoms.includes("cramps") || symptoms.includes("leg-pain");
  const tired = bloated || symptoms.includes("nausea") || energy < 35;

  const scale = useMemo(
    () => 0.9 + energy / 320 + (bloated ? 0.12 : 0),
    [energy, bloated],
  );

  const eyeY = EYE_Y[phase];
  const pulse = sos ? [1, 1.12, 1.12, 1] : [1, 1.05, 1];
  const pulseDuration = sos ? 19 : phase === "menstrual" ? 3.4 : inPain ? 1.6 : 4.2;

  return (
    <motion.button
      type="button"
      aria-label="Nora, your cycle companion. Tap to interact."
      onClick={() => {
        setWobble((w) => w + 1);
        onPoke?.();
      }}
      className="relative grid place-items-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
      style={{ width: size, height: size }}
      whileTap={{ scale: 0.94 }}
    >
      {/* ambient halo */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-[-28%] rounded-full ambient-glow"
        animate={{ opacity: sos ? [0.45, 0.9, 0.45] : [0.55, 0.9, 0.55], scale: pulse }}
        transition={{ duration: pulseDuration, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className="relative"
        style={{ color: "var(--phase)" }}
        key={wobble}
        initial={{ rotate: 0 }}
        animate={{ rotate: [0, -4, 3, -2, 0], scale }}
        transition={{ duration: 0.7, ease: "easeOut" }}
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
        </defs>

        <path
          d={SHAPES[phase]}
          fill={`url(#${fillId})`}
          filter={`url(#${blurId})`}
          opacity={0.55}
        />
        <motion.path
          d={SHAPES[phase]}
          fill={`url(#${fillId})`}
          animate={{ scale: sos ? [1, 1.06, 1.06, 1] : [1, 1.03, 1] }}
          style={{ transformOrigin: "100px 100px" }}
          transition={{ duration: pulseDuration, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* face */}
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

        {/* blush */}
        <ellipse cx="72" cy={eyeY + 14} rx="8" ry="5" fill="white" opacity="0.35" />
        <ellipse cx="128" cy={eyeY + 14} rx="8" ry="5" fill="white" opacity="0.35" />
      </motion.svg>

      {phase === "ovulation" &&
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
    </motion.button>
  );
}
