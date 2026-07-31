import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { MessageCircle, Stethoscope, ChevronLeft, ChevronRight } from "lucide-react";
import { avatarById } from "@/lib/avatars";
import { TopNav } from "@/components/TopNav";
import { PainMapper } from "@/components/PainMapper";
import { SosScreen } from "@/components/SosScreen";
import { GemmaChat } from "@/components/GemmaChat";
import { useNora } from "@/store/nora";
import { PHASE_META, SYMPTOMS, buildCycleWindow } from "@/lib/cycle";
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
    profile,
  } = useNora();
  const companion = avatarById(profile.avatarId);
  const navigate = useNavigate();
  const [mapper, setMapper] = useState(false);
  const [sos, setSos] = useState(false);

  const cycleWindow = useMemo(() => buildCycleWindow(profile), [profile]);

  useEffect(() => {
    if (hydrated && !onboarded) navigate({ to: "/onboarding", replace: true });
  }, [hydrated, onboarded, navigate]);

  return (
    <div
      data-phase={phase}
      data-avatar={profile.avatarId}
      className="min-h-screen bg-background pb-16 transition-colors duration-500"
    >
      <TopNav onSos={() => setSos(true)} />

      <main className="mx-auto max-w-xl px-4">
        {/* Hero — emotion companion is the feeling, not the Luna orb */}
        <section className="relative mt-4 flex flex-col items-center overflow-hidden rounded-4xl glass-panel px-4 pt-6 pb-7">
          <div className="pointer-events-none absolute inset-0 ambient-glow" aria-hidden />
          <motion.div
            key={companion.id}
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative flex w-full max-w-[240px] flex-col items-center"
          >
            <div className="grid aspect-square w-full place-items-center overflow-hidden rounded-[2rem] bg-card/70 shadow-[var(--shadow-soft)] ring-2 ring-primary/30">
              <img
                src={companion.url}
                alt={companion.name}
                className="h-full w-full object-contain p-4"
              />
            </div>
            <h2 className="relative mt-4 text-center text-xl font-extrabold tracking-tight text-foreground">
              {companion.name}
            </h2>
            <p className="relative mt-1 text-center text-xs font-bold uppercase tracking-wide text-phase-deep">
              {companion.mood}
            </p>
            <p className="relative mt-2 max-w-sm text-center text-sm leading-relaxed text-muted-foreground">
              {companion.description}
            </p>
          </motion.div>
          <p className="relative mt-4 text-center text-xs font-semibold text-muted-foreground">
            {PHASE_META[phase].label} · Day {cycleDay}
          </p>
          <h1 className="relative mt-2 text-center text-2xl font-extrabold tracking-tight">
            How are you feeling today?
          </h1>
        </section>

        {/* Cycle calendar — anchored to last period start, not month start */}
        <section className="mt-4 rounded-4xl glass-panel p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold">Cycle calendar</h2>
              <p className="text-[11px] font-semibold text-muted-foreground">
                Aligned to your last period
                {cycleWindow.cycleStart
                  ? ` · started ${cycleWindow.cycleStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                  : ""}
              </p>
            </div>
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
            {cycleWindow.days.map((cell) => {
              const active = cell.cycleDay === cycleDay;
              const dayNum = cell.date.getDate();
              return (
                <button
                  key={`${cell.cycleDay}-${dayNum}`}
                  data-phase={cell.phase}
                  onClick={() => setCycleDay(cell.cycleDay)}
                  title={`Cycle day ${cell.cycleDay} · ${cell.date.toLocaleDateString()}`}
                  className={`flex h-12 w-10 shrink-0 flex-col items-center justify-center rounded-2xl text-[10px] font-bold transition-transform ${
                    active
                      ? "phase-gradient text-primary-foreground scale-110"
                      : cell.isPeriod
                        ? "bg-menstrual/25 text-foreground ring-1 ring-menstrual/40"
                        : "bg-accent text-accent-foreground"
                  }`}
                >
                  <span className="text-[9px] font-semibold opacity-80">
                    {cell.date.toLocaleDateString(undefined, { weekday: "narrow" })}
                  </span>
                  <span className="text-xs">{dayNum}</span>
                  {cell.isToday && (
                    <span className="mt-0.5 h-1 w-1 rounded-full bg-current" />
                  )}
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-[11px] font-semibold leading-relaxed text-muted-foreground">
            {cycleWindow.insight}
          </p>
          {cycleWindow.nextPeriodStart && (
            <p className="mt-1 text-[11px] font-bold text-phase-deep">
              Next period expected around{" "}
              {cycleWindow.nextPeriodStart.toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
              })}
              {profile.periodLength
                ? ` for about ${profile.periodLength} day${profile.periodLength === 1 ? "" : "s"}`
                : ""}
              .
            </p>
          )}
        </section>

        {/* Check-in slider */}
        <section className="mt-4 rounded-4xl glass-panel p-5">
          <h2 className="text-sm font-bold">3-second check-in</h2>
          <p className="text-xs text-muted-foreground">
            Slide to tune how {companion.name} holds space with you today.
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

      <GemmaChat />

      <PainMapper open={mapper} onClose={() => setMapper(false)} />
      <SosScreen open={sos} onClose={() => setSos(false)} />
    </div>
  );
}
