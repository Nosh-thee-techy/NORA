import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { MessageCircle, Stethoscope, HeartPulse, Sparkles, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { avatarById } from "@/lib/avatars";
import { Luna } from "@/components/Luna";
import { TopNav } from "@/components/TopNav";
import { PainMapper } from "@/components/PainMapper";
import { SosScreen } from "@/components/SosScreen";
import { PoseGuideCamera } from "@/components/PoseGuideCamera";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useNora, cycleDayFromProfile } from "@/store/nora";
import { PHASE_META, SYMPTOMS, buildCycleWindow } from "@/lib/cycle";
import { getForecast } from "@/lib/forecast";

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
    energy,
    setEnergy,
    symptoms,
    toggleSymptom,
    phase,
    painPoints,
    onboarded,
    hydrated,
    profile,
    recoveryMode,
    setRecoveryMode,
    resilienceUnlocked,
    logTodaySignals,
    recordPatternMonth,
    resetOnboarding,
    endoRiskReason,
    patternMonthsLogged,
    monthLogs,
    endoRiskScore,
    endoRiskCategory,
    endoDailyLogs,
  } = useNora();
  const companion = avatarById(profile.avatarId);
  const navigate = useNavigate();
  const [mapper, setMapper] = useState(false);
  const [sos, setSos] = useState(false);
  const [poseCam, setPoseCam] = useState(false);
  const [wobbleNote, setWobbleNote] = useState(false);

  const cycleWindow = useMemo(() => buildCycleWindow(profile), [profile]);
  const todayCycleDay = useMemo(() => cycleDayFromProfile(profile), [profile]);
  const forecast = useMemo(() => getForecast(profile), [profile]);
  const todayCell = useMemo(
    () =>
      cycleWindow.days.find((d) => d.isToday) ??
      cycleWindow.days.find((d) => d.cycleDay === todayCycleDay),
    [cycleWindow.days, todayCycleDay],
  );

  const threeDayStrip = useMemo(() => {
    const days = cycleWindow.days;
    if (days.length === 0) return [];
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

  useEffect(() => {
    if (!hydrated || !onboarded) return;
    setCycleDay(todayCycleDay);
    // setCycleDay identity changes with store state — depend on profile inputs only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, onboarded, profile.lastPeriodStart, profile.cycleLength, todayCycleDay]);

  // Keep monthly pattern logs fresh when symptoms/pain change (not every energy tick)
  useEffect(() => {
    if (!hydrated || !onboarded) return;
    logTodaySignals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, onboarded, symptoms, painPoints.length]);

  if (!hydrated) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm font-semibold text-muted-foreground">
        Loading Nora…
      </div>
    );
  }

  if (!onboarded) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm font-semibold text-muted-foreground">
        Taking you to setup…
      </div>
    );
  }

  return (
    <div
      data-phase={phase}
      data-avatar={profile.avatarId}
      data-forecast={forecast.warmerUi ? "warm" : "calm"}
      className={`min-h-screen pb-16 transition-colors duration-500 ${
        forecast.warmerUi
          ? "bg-[color-mix(in_oklab,var(--menstrual)_14%,var(--background))]"
          : "bg-background"
      }`}
    >
      <TopNav onSos={() => setSos(true)} />

      <main className="mx-auto max-w-xl px-4">
        {forecast.prompt && (
          <section className="mt-4 rounded-3xl border border-menstrual/30 bg-menstrual/10 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-phase-deep">
              Forecast care
            </p>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-foreground">
              {forecast.prompt}
            </p>
            <button
              type="button"
              onClick={() => setPoseCam(true)}
              className="mt-2 text-xs font-bold text-phase-deep underline"
            >
              Open Child’s Pose camera guide
            </button>
          </section>
        )}

        {/* Hero — companion-led feeling check-in (restored) */}
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
              alt={companion.name}
              className="h-44 w-44 object-contain drop-shadow-[0_18px_40px_color-mix(in_oklab,var(--phase)_35%,transparent)] sm:h-52 sm:w-52"
            />
            <p className="mt-3 text-center text-sm font-bold text-foreground">
              {companion.mood}
            </p>
            <p className="mt-1 max-w-[22rem] text-center text-sm leading-relaxed text-muted-foreground">
              {companion.description}
            </p>
            <button
              type="button"
              onClick={() => {
                resetOnboarding();
                navigate({ to: "/onboarding" });
              }}
              className="mt-3 text-[11px] font-bold text-phase-deep underline"
            >
              Change companion / redo setup
            </button>
          </motion.div>
        </section>

        {/* Body-state Luna — keeps concept interactions without replacing companion */}
        <section className="relative mt-4 overflow-hidden rounded-4xl glass-panel px-5 pb-5 pt-4">
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">Nora’s body signal</h2>
              <p className="text-xs text-muted-foreground">
                Drag or slide energy — Endo Belly inflates Luna; recovery softens her.
              </p>
            </div>
            {resilienceUnlocked && (
              <p className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-200/40 px-2.5 py-1 text-[10px] font-bold text-amber-900">
                <Sparkles className="h-3 w-3" />
                Resilience
              </p>
            )}
          </div>

          <div className="relative mt-2 flex flex-col items-center">
            <Luna
              phase={recoveryMode ? "follicular" : phase}
              energy={energy}
              symptoms={symptoms}
              size={200}
              resilience={resilienceUnlocked}
              recovery={recoveryMode}
              energyInteractive
              onEnergyChange={setEnergy}
              onPoke={() => {
                setWobbleNote(true);
                setTimeout(() => setWobbleNote(false), 1600);
              }}
            />
            <p className="mt-1 text-center text-sm font-semibold text-muted-foreground">
              {wobbleNote
                ? "Nora felt that — I'm right here."
                : recoveryMode
                  ? "Post-op rest mode · soft cloud support"
                  : PHASE_META[phase].blurb}
            </p>
          </div>

          <div className="relative mt-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold">Energy</h3>
              <span className="text-xs font-bold text-foreground">{energy}%</span>
            </div>
            <Slider
              value={[energy]}
              min={0}
              max={100}
              step={1}
              onValueChange={(v) => setEnergy(v[0] ?? 0)}
              className="mt-3"
            />
            <div className="mt-1 flex justify-between text-[11px] font-semibold text-muted-foreground">
              <span>Low / calm</span>
              <span>Radiant</span>
            </div>
          </div>

          <label className="relative mt-4 flex items-center justify-between gap-3 rounded-2xl bg-card/70 px-3 py-2.5">
            <span className="text-xs font-bold text-foreground">
              Post-op recovery mode
              <span className="mt-0.5 block font-semibold text-muted-foreground">
                Soft cloud rest + healing light particles
              </span>
            </span>
            <Switch checked={recoveryMode} onCheckedChange={setRecoveryMode} />
          </label>

          {recoveryMode && (
            <div className="relative mt-3 space-y-2 rounded-2xl bg-sky-100/50 px-3 py-3">
              <p className="text-xs font-bold text-sky-950">Recovery journey</p>
              {[
                "Day 1–3 · Rest cloud — short walks only if cleared",
                "Week 1 · Gentle breath + supported Child’s Pose (no strain)",
                "Week 2+ · Reintroduce energy slides slowly with Nora",
              ].map((line) => (
                <p
                  key={line}
                  className="rounded-xl bg-white/60 px-3 py-2 text-[11px] font-semibold text-sky-950/90"
                >
                  {line}
                </p>
              ))}
            </div>
          )}

          <div className="relative mt-4 rounded-2xl bg-card/70 px-3 py-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-foreground">Endo risk → resilience</p>
                <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                  {endoRiskReason}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-accent-foreground">
                {Math.min(patternMonthsLogged, 3)}/3
              </span>
            </div>
            <div className="mt-2 flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${
                    i < patternMonthsLogged ? "bg-amber-400" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            {monthLogs.length > 0 && (
              <p className="mt-2 text-[10px] font-semibold text-muted-foreground">
                Logged: {monthLogs.map((m) => m.month).join(" · ")}
              </p>
            )}
            {!resilienceUnlocked && (
              <button
                type="button"
                onClick={() => {
                  const credited = recordPatternMonth();
                  const already = monthLogs.some((m) => m.month === credited);
                  const shown = Math.min(3, already ? monthLogs.length : monthLogs.length + 1);
                  toast.success(`Credited ${credited} · ${shown}/3 toward resilience`, {
                    description:
                      shown >= 3
                        ? "Three-month pattern locked — Nora’s resilience glow should appear."
                        : "Tap again to credit another prior month.",
                  });
                }}
                className="mt-2 rounded-full bg-phase/15 px-3 py-1.5 text-[11px] font-bold text-phase-deep"
              >
                Credit high-pain pattern month
              </button>
            )}
          </div>
        </section>

        {/* Cycle calendar */}
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

        {/* Symptom chips — grouped by clinical category */}
        <section className="mt-4 rounded-4xl glass-panel p-5">
          <h2 className="text-sm font-bold">Quick symptoms</h2>
          <p className="text-xs text-muted-foreground">
            Tap to log — these feed Nora's endometriosis pattern engine.
          </p>

          {(["pain", "gi-urinary", "general"] as const).map((cat) => {
            const catSymptoms = SYMPTOMS.filter((s) => s.category === cat);
            const catLabel = cat === "pain" ? "Pain" : cat === "gi-urinary" ? "GI & Urinary" : "General";
            return (
              <div key={cat} className="mt-3">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {catLabel}
                </p>
                <div className="flex flex-wrap gap-2">
                  {catSymptoms.map((s) => {
                    const on = symptoms.includes(s.id);
                    return (
                      <motion.button
                        key={s.id}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => toggleSymptom(s.id)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
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
              </div>
            );
          })}

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

        {/* Endo screening score */}
        {endoDailyLogs.length >= 7 && (
          <section className="mt-4 rounded-3xl glass-panel px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800">
                <ShieldAlert className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold">
                  Endo Screening Score: {endoRiskScore}/100
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    endoRiskCategory === "Very High" || endoRiskCategory === "High"
                      ? "bg-red-100 text-red-800"
                      : endoRiskCategory === "Moderate"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-green-100 text-green-800"
                  }`}>
                    {endoRiskCategory}
                  </span>
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Based on {endoDailyLogs.length} days of tracking. Not a diagnosis.
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="mt-4 flex items-center gap-3 rounded-3xl glass-panel px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground">
            <MessageCircle className="h-4 w-4" />
          </span>
          <p className="text-xs font-semibold">
            WhatsApp care line ready
            <span className="block font-normal text-muted-foreground">
              SOS can open WhatsApp/SMS to your emergency contact.
            </span>
          </p>
        </section>

        <button
          type="button"
          onClick={() => setSos(true)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive py-3.5 text-sm font-bold text-destructive-foreground"
        >
          <HeartPulse className="h-4 w-4" />
          Open Crisis Flare Mode
        </button>

        <p className="mt-5 text-center text-[11px] text-muted-foreground">
          Works offline — your logs stay on this device until you choose to share them.
        </p>
      </main>

      <PainMapper open={mapper} onClose={() => setMapper(false)} />
      <SosScreen open={sos} onClose={() => setSos(false)} />
      <PoseGuideCamera open={poseCam} onClose={() => setPoseCam(false)} />
    </div>
  );
}
