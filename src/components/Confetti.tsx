import { motion } from "motion/react";
import { useMemo } from "react";

const COLORS = [
  "var(--follicular)",
  "var(--ovulation)",
  "var(--luteal)",
  "var(--menstrual)",
];

/** Lightweight celebratory particle burst — no extra dependencies. */
export function Confetti({ active, pieces = 60 }: { active: boolean; pieces?: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        drift: (Math.random() - 0.5) * 160,
        delay: Math.random() * 0.5,
        duration: 1.6 + Math.random() * 1.4,
        size: 6 + Math.random() * 8,
        rotate: Math.random() * 720 - 360,
        color: COLORS[i % COLORS.length],
        round: Math.random() > 0.6,
      })),
    [pieces],
  );

  if (!active) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-[-8%]"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size * (p.round ? 1 : 0.5),
            borderRadius: p.round ? "9999px" : "2px",
            background: p.color,
          }}
          initial={{ y: 0, opacity: 0, rotate: 0 }}
          animate={{
            y: ["0vh", "115vh"],
            x: [0, p.drift],
            opacity: [0, 1, 1, 0],
            rotate: p.rotate,
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}
