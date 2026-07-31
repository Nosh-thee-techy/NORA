import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { MessageCircle, Stethoscope, ChevronLeft, ChevronRight } from "lucide-react";
import { Luna } from "@/components/Luna";
import { avatarById } from "@/lib/avatars";
import { TopNav } from "@/components/TopNav";
import { PainMapper } from "@/components/PainMapper";
import { SosScreen } from "@/components/SosScreen";
import { useNora } from "@/store/nora";
import { PHASE_META, SYMPTOMS, CYCLE_LENGTH, phaseForDay } from "@/lib/cycle";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NORA — Bloom Cycle & Endometriosis Companion" },
      {
        name: "description",
        content:
          "Track your cycle with Luna, an empathetic companion that reflects your symptoms, and screen quietly for endometriosis signs — offline-first.",
      },
      { property: "og:title", content: "NORA — Bloom Cycle & Endometriosis Companion" },
      {
        property: "og:description",
        content:
          "An empathetic, offline-first menstrual health tracker with Luna, your living cycle companion.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const {
    cycleDay,
    setCycleDay,
    energy,
    setEnergy,
    symptoms,
    toggleSymptom,
    phase,
    painPoints,
    onboarded,
    hydrated,
  } = useNora();
  const navigate = useNavigate();
  const [mapper, setMapper] = useState(false);
  const [sos, setSos] = useState(false);
  const [wobbleNote, setWobbleNote] = useState(false);

  useEffect(() => {
    if (hydrated && !onboarded) navigate({ to: "/onboarding", replace: true });
  }, [hydrated, onboarded, navigate]);



  return (
    <div data-phase={phase} className="min-h-screen bg-background pb-16">
      <TopNav onSos={() => setSos(true)} />

      <main className="mx-auto max-w-xl px-4">
        {/* Hero */}
        <section className="relative mt-4 flex flex-col items-center overflow-hidden rounded-4xl glass-panel px-4 pt-6 pb-7">
          <div className="pointer-events-none absolute inset-0 ambient-glow" aria-hidden />
          <Luna
            phase={phase}
            energy={energy}
            symptoms={symptoms}
            onPoke={() => {
              setWobbleNote(true);
              setTimeout(() => setWobbleNote(false), 1800);
            }}
          />
          <motion.p
            key={phase + String(wobbleNote)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative -mt-2 text-center text-sm font-semibold text-muted-foreground"
          >
            {wobbleNote ? "Luna wobbles softly. I'm right here. 💛" : PHASE_META[phase].blurb}
          </motion.p>
          <h1 className="relative mt-3 text-center text-2xl font-extrabold tracking-tight">
            How are you feeling today, Sarah?
          </h1>
          <div className="relative mt-3 flex items-center gap-3 rounded-full bg-card/70 px-3 py-2">
            <img
              src={companion.url}
              alt={companion.name}
              className="h-10 w-10 rounded-full object-contain"
            />
            <span className="text-xs font-bold text-foreground">
              {companion.name}
              <span className="ml-1 font-semibold text-muted-foreground">
                · {companion.mood}
              </span>
            </span>
          </div>
        </section>

        {/* Cycle calendar strip */}
        <section className="mt-4 rounded-4xl glass-panel p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Cycle calendar</h2>
            <div className="flex gap-1">
              <button
                aria-label="Previous day"
                onClick={() => setCycleDay(cycleDay - 1)}
                className="rounded-full bg-secondary p-1.5"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                aria-label="Next day"
                onClick={() => setCycleDay(cycleDay + 1)}
                className="rounded-full bg-secondary p-1.5"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
            {Array.from({ length: CYCLE_LENGTH }, (_, i) => i + 1).map((d) => {
              const p = phaseForDay(d);
              const active = d === cycleDay;
              return (
                <button
                  key={d}
                  data-phase={p}
                  onClick={() => setCycleDay(d)}
                  className={`h-9 w-9 shrink-0 rounded-2xl text-xs font-bold transition-transform ${
                    active
                      ? "phase-gradient text-primary-foreground scale-110"
                      : "bg-accent text-accent-foreground"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </section>

        {/* Check-in slider */}
        <section className="mt-4 rounded-4xl glass-panel p-5">
          <h2 className="text-sm font-bold">3-second check-in</h2>
          <p className="text-xs text-muted-foreground">
            Slide to tune Luna's energy — she changes live.
          </p>
          <Slider
            value={[energy]}
            min={0}
            max={100}
            step={1}
            onValueChange={(v) => setEnergy(v[0] ?? 0)}
            className="mt-4"
          />
          <div className="mt-2 flex justify-between text-[11px] font-semibold text-muted-foreground">
            <span>Low energy</span>
            <span className="text-foreground">{energy}%</span>
            <span>Radiant</span>
          </div>
        </section>

        {/* Symptom chips */}
        <section className="mt-4 rounded-4xl glass-panel p-5">
          <h2 className="text-sm font-bold">Quick symptoms</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {SYMPTOMS.map((s) => {
              const on = symptoms.includes(s.id);
              return (
                <motion.button
                  key={s.id}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => toggleSymptom(s.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    on
                      ? "phase-gradient text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {s.label}
                </motion.button>
              );
            })}
          </div>

          <button
            onClick={() => setMapper(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-bold"
          >
            <Stethoscope className="h-4 w-4" />
            Detailed Pain Log
            {painPoints.length > 0 && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] text-accent-foreground">
                {painPoints.length}
              </span>
            )}
          </button>
        </section>

        {/* WhatsApp sync */}
        <section className="mt-4 flex items-center gap-3 rounded-3xl glass-panel px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground">
            <MessageCircle className="h-4 w-4" />
          </span>
          <p className="text-xs font-semibold">
            Connected to WhatsApp
            <span className="block font-normal text-muted-foreground">
              Reply to daily check-ins on WhatsApp anytime.
            </span>
          </p>
        </section>

        <p className="mt-5 text-center text-[11px] text-muted-foreground">
          Works offline — your logs stay on this device until you choose to share them.
        </p>
      </main>

      <PainMapper open={mapper} onClose={() => setMapper(false)} />
      <SosScreen open={sos} onClose={() => setSos(false)} />
    </div>
  );
}
