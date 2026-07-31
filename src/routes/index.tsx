import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { MessageCircle, Stethoscope } from "lucide-react";
import { avatarById } from "@/lib/avatars";
import { TopNav } from "@/components/TopNav";
import { PainMapper } from "@/components/PainMapper";
import { SosScreen } from "@/components/SosScreen";
import { useNora, cycleDayFromProfile } from "@/store/nora";
import { PHASE_META, SYMPTOMS, buildCycleWindow } from "@/lib/cycle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nora — Cycle & Endometriosis Companion" },
      {
        name: "description",
        content:
          "Track your cycle with Nora, an empathetic companion that reflects your symptoms, and screen quietly for endometriosis signs — offline-first.",
      },
      { property: "og:title", content: "Nora — Cycle & Endometriosis Companion" },
      {
        property: "og:description",
        content:
          "An empathetic, offline-first menstrual health tracker with Nora, your living cycle companion.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const {
    cycleDay,
    setCycleDay,
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
  const todayCycleDay = useMemo(() => cycleDayFromProfile(profile), [profile]);
  const todayCell = useMemo(
    () => cycleWindow.days.find((d) => d.isToday) ?? cycleWindow.days.find((d) => d.cycleDay === todayCycleDay),
    [cycleWindow.days, todayCycleDay],
  );

  const threeDayStrip = useMemo(() => {
    const days = cycleWindow.days;
    if (days.length === 0) return [];
    // Always center on real today so the strip answers "what is today in my cycle?"
    const todayIdx = Math.max(
      0,
      days.findIndex((d) => d.isToday || d.cycleDay === todayCycleDay),
    );
    const prev = days[(todayIdx - 1 + days.length) % days.length]!;
    const current = days[todayIdx]!;
    const next = days[(todayIdx + 1) % days.length]!;
    return [
      { cell: prev, label: "Yesterday" },
      { cell: current, label: "Today" },
      { cell: next, label: "Tomorrow" },
    ];
  }, [cycleWindow.days, todayCycleDay]);

  useEffect(() => {
    if (hydrated && !onboarded) navigate({ to: "/onboarding", replace: true });
  }, [hydrated, onboarded, navigate]);

  // On load, snap cycle day to what today actually is in this cycle
  useEffect(() => {
    if (!hydrated || !onboarded) return;
    setCycleDay(todayCycleDay);
    // intentionally only when profile/onboarding identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, onboarded, profile.lastPeriodStart, profile.cycleLength, todayCycleDay, setCycleDay]);

  return (
    <div
      data-phase={phase}
      data-avatar={profile.avatarId}
      className="min-h-screen bg-background pb-16 transition-colors duration-500"
    >
      <TopNav onSos={() => setSos(true)} />

      <main className="mx-auto max-w-xl px-4">
        {/* Hero — companion-led feeling check-in */}
        <section className="relative mt-4 overflow-hidden rounded-4xl glass-panel px-5 pb-6 pt-5">
          <div className="pointer-events-none absolute inset-0 ambient-glow" aria-hidden />

          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-phase-deep">
                Today’s check-in
              </p>
              <h1 className="mt-1 text-balance text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-[1.75rem]">
                How are you feeling with{" "}
                <span className="text-phase-deep">{companion.name}</span>?
              </h1>
            </div>
            <span className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-[11px] font-bold text-accent-foreground">
              Day {cycleDay}
              <span className="mx-1 opacity-50">·</span>
              {PHASE_META[phase].label}
            </span>
          </div>

          <motion.div
            key={companion.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative mt-5 flex flex-col items-center"
          >
            <img
              src={companion.url}
              alt=""
              aria-hidden
              className="h-44 w-44 object-contain drop-shadow-[0_18px_40px_color-mix(in_oklab,var(--phase)_35%,transparent)] sm:h-52 sm:w-52"
            />

            <p className="mt-3 text-center text-sm font-bold text-foreground">
              {companion.mood}
            </p>
            <p className="mt-1 max-w-[22rem] text-center text-sm leading-relaxed text-muted-foreground">
              {companion.description}
            </p>
          </motion.div>
        </section>

        {/* Cycle calendar — yesterday / today / tomorrow, with cycle meaning */}
        <section className="mt-4 rounded-4xl glass-panel p-4">
          <div className="min-w-0">
            <h2 className="text-sm font-bold">Cycle calendar</h2>
            <p className="mt-1 text-sm font-extrabold leading-snug text-foreground">
              Today is cycle day {todayCycleDay} of {cycleWindow.cycleLength}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
              {PHASE_META[todayCell?.phase ?? phase].label} phase
              {todayCell
                ? ` · ${todayCell.date.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}`
                : ""}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {threeDayStrip.map(({ cell, label }) => {
              const active = cell.isToday;
              return (
                <button
                  key={`${label}-${cell.cycleDay}`}
                  data-phase={cell.phase}
                  onClick={() => setCycleDay(cell.cycleDay)}
                  title={`${label} · ${cell.date.toLocaleDateString()} · cycle day ${cell.cycleDay}`}
                  className={`flex flex-col items-center justify-center rounded-3xl px-2 py-3 transition-transform ${
                    active
                      ? "phase-gradient scale-[1.03] text-primary-foreground shadow-[var(--shadow-soft)]"
                      : cell.isPeriod
                        ? "bg-menstrual/20 text-foreground ring-1 ring-menstrual/35"
                        : "bg-accent/80 text-accent-foreground"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">
                    {label}
                  </span>
                  <span className="mt-1 text-2xl font-extrabold leading-none">
                    {cell.date.getDate()}
                  </span>
                  <span className="mt-1 text-[10px] font-semibold opacity-80">
                    {cell.date.toLocaleDateString(undefined, { weekday: "short" })}
                  </span>
                  <span
                    className={`mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      active ? "bg-primary-foreground/15" : "bg-background/60"
                    }`}
                  >
                    Day {cell.cycleDay}
                  </span>
                </button>
              );
            })}
          </div>

          {cycleWindow.nextPeriodStart && (
            <p className="mt-3 text-center text-[11px] font-bold text-phase-deep">
              Next period expected{" "}
              {cycleWindow.nextPeriodStart.toLocaleDateString(undefined, {
                weekday: "short",
                month: "long",
                day: "numeric",
              })}
              <span className="font-semibold text-muted-foreground">
                {" "}
                · about {cycleWindow.periodLength} days
              </span>
            </p>
          )}
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
