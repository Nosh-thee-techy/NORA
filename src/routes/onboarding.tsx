import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { format } from "date-fns";
import {
  CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Luna } from "@/components/Luna";
import { Confetti } from "@/components/Confetti";
import { AvatarTheme } from "@/components/AvatarTheme";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useNora, DEFAULT_PROFILE, type OnboardingProfile } from "@/store/nora";
import {
  buildCycleWindow,
  type Phase,
} from "@/lib/cycle";
import { AVATARS, avatarIndex } from "@/lib/avatars";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome to Bloom — Set Up Luna, Your Cycle Companion" },
      {
        name: "description",
        content:
          "A gentle 4-step setup: share your cycle rhythm, tell Luna how your period days feel, and link WhatsApp for 3-second daily check-ins.",
      },
      {
        property: "og:title",
        content: "Welcome to Bloom — Set Up Luna, Your Cycle Companion",
      },
      {
        property: "og:description",
        content:
          "Private, offline-first onboarding for NORA. Align Luna with your rhythm in under a minute.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

const PERIOD_LENGTHS = [3, 5, 7] as const;

const SYMPTOM_OPTIONS = [
  { id: "standard-cramps", label: "Standard Cramps" },
  { id: "severe-pain", label: "Unbearable / Severe Pain", tender: true },
  { id: "bloating", label: 'Bloating / "Endo Belly"' },
  { id: "radiating-pain", label: "Pain Radiating to Back/Thighs", tender: true },
  { id: "missed-work", label: "Missed Work or School" },
  { id: "heavy-flow", label: "Heavy Flow" },
  { id: "digestive-pain", label: "Digestive / Bowel Pain" },
];

const COUNTRY_CODES = ["+1", "+44", "+27", "+31", "+33", "+49", "+61", "+91", "+234"];

const STEP_PHASE: Phase[] = ["follicular", "follicular", "luteal", "ovulation"];

function Onboarding() {
  const navigate = useNavigate();
  const { completeOnboarding, onboarded, hydrated } = useNora();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [celebrating, setCelebrating] = useState(false);
  const [tenderNote, setTenderNote] = useState(false);
  const [profile, setProfile] = useState<OnboardingProfile>({
    ...DEFAULT_PROFILE,
    lastPeriodStart: format(new Date(), "yyyy-MM-dd"),
  });

  useEffect(() => {
    if (hydrated && onboarded) navigate({ to: "/", replace: true });
  }, [hydrated, onboarded, navigate]);

  const tenderSelected = useMemo(
    () =>
      profile.profileSymptoms.some((s) => s === "severe-pain" || s === "radiating-pain"),
    [profile.profileSymptoms],
  );

  const phase: Phase = tenderNote || (step === 2 && tenderSelected)
    ? "menstrual"
    : (STEP_PHASE[step] ?? "follicular");

  const patch = (p: Partial<OnboardingProfile>) => setProfile((s) => ({ ...s, ...p }));

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const toggleSymptom = (id: string, tender?: boolean) => {
    setProfile((s) => {
      const has = s.profileSymptoms.includes(id);
      if (!has && tender) {
        setTenderNote(true);
        setTimeout(() => setTenderNote(false), 2600);
      }
      return {
        ...s,
        profileSymptoms: has
          ? s.profileSymptoms.filter((x) => x !== id)
          : [...s.profileSymptoms, id],
      };
    });
  };

  const finish = () => {
    setCelebrating(true);
    completeOnboarding(profile);
    setTimeout(() => navigate({ to: "/", replace: true }), 1500);
  };

  return (
    <div
      data-phase={phase}
      data-avatar={profile.avatarId}
      className="relative flex min-h-screen flex-col overflow-hidden bg-background transition-colors duration-500"
    >
      <AvatarTheme avatarId={profile.avatarId} />
      <motion.div
        aria-hidden
        key={`${phase}-${profile.avatarId}`}
        className="pointer-events-none absolute inset-0 ambient-glow"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.1 }}
      />
      <Confetti active={celebrating} />

      {/* Progress */}
      <header className="relative z-10 px-5 pt-6">
        <div className="mx-auto flex max-w-md items-center gap-3">
          {step > 0 && !celebrating ? (
            <button
              type="button"
              onClick={() => go(step - 1)}
              aria-label="Go back"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : (
            <span className="h-8 w-8 shrink-0" />
          )}
          <div className="flex min-w-0 flex-1 gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full phase-gradient"
                  initial={false}
                  animate={{ width: i <= step ? "100%" : "0%" }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            ))}
          </div>
          <span className="shrink-0 text-xs font-bold text-muted-foreground">
            {step + 1}/4
          </span>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-6">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -48 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="flex flex-1 flex-col"
          >
            {step === 0 && (
              <StepWelcome
                avatarId={profile.avatarId}
                onPick={(id) => patch({ avatarId: id })}
                onStart={() => go(1)}
              />
            )}

            {step === 1 && (
              <StepCycle profile={profile} patch={patch} onContinue={() => go(2)} />
            )}

            {step === 2 && (
              <StepSymptoms
                selected={profile.profileSymptoms}
                onToggle={toggleSymptom}
                tenderNote={tenderNote}
                onContinue={() => go(3)}
              />
            )}

            {step === 3 && (
              <StepConnect profile={profile} patch={patch} onFinish={finish} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

/* ---------------- Step 1 ---------------- */

function StepWelcome({
  avatarId,
  onPick,
  onStart,
}: {
  avatarId: string;
  onPick: (id: string) => void;
  onStart: () => void;
}) {
  const index = avatarIndex(avatarId);
  const avatar = AVATARS[index]!;
  const [slideDir, setSlideDir] = useState(0);

  const goAvatar = (nextIndex: number, dir: number) => {
    const wrapped = (nextIndex + AVATARS.length) % AVATARS.length;
    setSlideDir(dir);
    onPick(AVATARS[wrapped]!.id);
  };

  return (
    <div className="flex flex-1 flex-col items-center">
      <h1 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-foreground">
        Meet Bloom—Your Cycle &amp; Body Companion.
      </h1>
      <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
        A safe, private space that listens to your body, validates your pain, and grows
        with you every single month.
      </p>

      <div className="mt-6 w-full">
        <p className="text-center text-sm font-bold text-foreground">
          Pick the companion that feels like you today
        </p>
        <p className="mt-1 text-center text-xs font-semibold text-muted-foreground">
          One at a time — use the arrows to meet each emotion
        </p>

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous companion"
            onClick={() => goAvatar(index - 1, -1)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground shadow-[var(--shadow-soft)] transition-transform active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="relative min-w-0 flex-1">
            <AnimatePresence mode="wait" custom={slideDir}>
              <motion.div
                key={avatar.id}
                custom={slideDir}
                initial={{ opacity: 0, x: slideDir * 40, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: slideDir * -40, scale: 0.96 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="flex flex-col items-center"
              >
                <div className="relative grid aspect-square w-full max-w-[220px] place-items-center overflow-hidden">
                  <img
                    src={avatar.url}
                    alt={avatar.name}
                    className="h-full w-full object-contain drop-shadow-[0_18px_40px_color-mix(in_oklab,var(--phase)_35%,transparent)]"
                  />
                  <span className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full phase-gradient text-primary-foreground shadow-[var(--shadow-soft)]">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                </div>

                <h2 className="mt-4 text-center text-xl font-extrabold tracking-tight text-foreground">
                  {avatar.name}
                </h2>
                <p className="mt-1 text-center text-xs font-bold uppercase tracking-wide text-phase-deep">
                  {avatar.mood}
                </p>
                <p className="mt-2 max-w-sm text-center text-sm leading-relaxed text-muted-foreground">
                  {avatar.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            type="button"
            aria-label="Next companion"
            onClick={() => goAvatar(index + 1, 1)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground shadow-[var(--shadow-soft)] transition-transform active:scale-95"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex justify-center gap-1.5">
          {AVATARS.map((a, i) => (
            <button
              key={a.id}
              type="button"
              aria-label={`Show ${a.name}`}
              aria-current={i === index}
              onClick={() => goAvatar(i, i > index ? 1 : -1)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-6 phase-gradient" : "w-1.5 bg-muted",
              )}
            />
          ))}
        </div>
      </div>

      <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-bold text-accent-foreground">
        <ShieldCheck className="h-4 w-4" />
        100% Private • Offline-First Data
      </span>

      <BottomAction label={`Continue with ${avatar.name}`} onClick={onStart} />
    </div>
  );
}

/* ---------------- Step 2 ---------------- */

function StepCycle({
  profile,
  patch,
  onContinue,
}: {
  profile: OnboardingProfile;
  patch: (p: Partial<OnboardingProfile>) => void;
  onContinue: () => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = profile.lastPeriodStart
    ? new Date(profile.lastPeriodStart + "T00:00:00")
    : undefined;
  const unsure = profile.cycleLength === null;

  return (
    <div className="flex flex-1 flex-col">
      <StepHeading
        title="Let's align with your rhythm."
        subtitle="Bloom uses this to help Luna evolve alongside your body's natural phases."
      />

      <div className="mt-6 space-y-5">
        <section className="glass-panel rounded-3xl p-4">
          <Label className="text-sm font-bold">When did your last period start?</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="mt-3 w-full justify-start rounded-2xl text-left font-semibold"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "EEEE, d MMMM") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => {
                  if (d) patch({ lastPeriodStart: format(d, "yyyy-MM-dd") });
                  setOpen(false);
                }}
                disabled={{ after: new Date() }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </section>

        <section className="glass-panel rounded-3xl p-4">
          <div className="flex items-baseline justify-between gap-3">
            <Label className="text-sm font-bold">
              How long does your cycle usually last?
            </Label>
            <span className="shrink-0 text-sm font-extrabold text-phase-deep">
              {unsure ? "—" : `${profile.cycleLength} days`}
            </span>
          </div>
          <Slider
            className="mt-4"
            min={21}
            max={35}
            step={1}
            value={[profile.cycleLength ?? 28]}
            onValueChange={([v]) => patch({ cycleLength: v ?? 28 })}
          />
          <div className="mt-2 flex justify-between text-[11px] font-semibold text-muted-foreground">
            <span>21 days</span>
            <span>35 days</span>
          </div>
          <Pill
            active={unsure}
            onClick={() => patch({ cycleLength: unsure ? 28 : null })}
            className="mt-3"
          >
            I'm not sure
          </Pill>
        </section>

        <section className="glass-panel rounded-3xl p-4">
          <Label className="text-sm font-bold">
            How long does your period usually last?
          </Label>
          <div className="mt-3 flex flex-wrap gap-2">
            {PERIOD_LENGTHS.map((d) => (
              <Pill
                key={d}
                active={profile.periodLength === d}
                onClick={() => patch({ periodLength: d })}
              >
                {d === 7 ? "7+ days" : `${d} days`}
              </Pill>
            ))}
          </div>
        </section>

        {profile.lastPeriodStart && (
          <p className="rounded-2xl bg-accent/60 px-4 py-3 text-center text-xs font-semibold leading-relaxed text-accent-foreground">
            {buildCycleWindow(profile).insight}
          </p>
        )}

        <p className="text-center text-xs font-semibold text-muted-foreground">
          Don't worry if it's irregular—Luna adapts to you. We never assume your period
          starts on the 1st of the month.
        </p>
      </div>

      <BottomAction label="Continue" onClick={onContinue} />
    </div>
  );
}

/* ---------------- Step 3 ---------------- */

function StepSymptoms({
  selected,
  onToggle,
  tenderNote,
  onContinue,
}: {
  selected: string[];
  onToggle: (id: string, tender?: boolean) => void;
  tenderNote: boolean;
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <StepHeading
        title="What do your period days usually feel like?"
        subtitle="Select all that apply so Luna knows when to support you extra."
      />

      <div className="mt-4 flex flex-col items-center">
        <Luna phase={tenderNote ? "menstrual" : "luteal"} energy={50} symptoms={[]} size={140} />
        <AnimatePresence>
          {tenderNote && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-1 flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-bold text-accent-foreground"
            >
              <Heart className="h-3.5 w-3.5" />
              We hear you. You're in safe hands.
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        {SYMPTOM_OPTIONS.map((s) => {
          const active = selected.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(s.id, s.tender)}
              className={cn(
                "flex min-h-16 items-center gap-2 rounded-2xl border px-3.5 py-3 text-left text-sm font-bold transition-all",
                active
                  ? "border-transparent bg-accent text-accent-foreground shadow-[var(--shadow-soft)]"
                  : "border-border bg-card text-foreground hover:bg-accent/40",
              )}
            >
              <span
                className={cn(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                  active
                    ? "border-transparent phase-gradient text-primary-foreground"
                    : "border-border",
                )}
              >
                {active && <Check className="h-3 w-3" />}
              </span>
              <span className="min-w-0">{s.label}</span>
            </button>
          );
        })}
      </div>

      <BottomAction label="Continue" onClick={onContinue} />
    </div>
  );
}

/* ---------------- Step 4 ---------------- */

function StepConnect({
  profile,
  patch,
  onFinish,
}: {
  profile: OnboardingProfile;
  patch: (p: Partial<OnboardingProfile>) => void;
  onFinish: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <StepHeading
        title="Track effortlessly, stay supported."
        subtitle="Receive quick 3-second daily check-ins on WhatsApp without even opening the app."
      />

      <div className="mt-6 space-y-4">
        <section className="glass-panel rounded-3xl p-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-2xl phase-gradient text-primary-foreground">
              <MessageCircle className="h-4 w-4" />
            </span>
            <Label className="min-w-0 text-sm font-bold">Your WhatsApp number</Label>
          </div>

          <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-2">
            <select
              aria-label="Country code"
              value={profile.whatsappCountry}
              onChange={(e) => patch({ whatsappCountry: e.target.value })}
              className="h-10 rounded-2xl border border-input bg-card px-3 text-sm font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <Input
              inputMode="tel"
              maxLength={15}
              placeholder="72 123 4567"
              value={profile.whatsappNumber}
              onChange={(e) =>
                patch({ whatsappNumber: e.target.value.replace(/[^\d\s]/g, "") })
              }
              className="h-10 rounded-2xl"
            />
          </div>

          <label className="mt-4 flex items-center justify-between gap-3">
            <span className="min-w-0 text-xs font-semibold text-muted-foreground">
              Send me 8:00 PM daily check-in messages on WhatsApp
            </span>
            <Switch
              checked={profile.dailyCheckin}
              onCheckedChange={(v) => patch({ dailyCheckin: v })}
            />
          </label>
        </section>

        <section className="glass-panel rounded-3xl p-4">
          <Label className="text-sm font-bold">
            Emergency Contact Phone Number{" "}
            <span className="font-semibold text-muted-foreground">(optional)</span>
          </Label>
          <Input
            inputMode="tel"
            maxLength={20}
            placeholder="Partner, friend, caregiver"
            value={profile.emergencyContact}
            onChange={(e) =>
              patch({ emergencyContact: e.target.value.replace(/[^\d+\s]/g, "") })
            }
            className="mt-3 h-10 rounded-2xl"
          />
          <p className="mt-2 text-xs font-semibold text-muted-foreground">
            If you hit the SOS Severe Pain button, we can send them an automated alert.
          </p>
        </section>
      </div>

      <BottomAction label="Meet Luna & Complete Setup" icon onClick={onFinish} />
    </div>
  );
}

/* ---------------- shared bits ---------------- */

function StepHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mt-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-bold transition-all",
        active
          ? "border-transparent phase-gradient text-primary-foreground shadow-[var(--shadow-soft)]"
          : "border-border bg-card text-foreground hover:bg-accent/40",
        className,
      )}
    >
      {children}
    </button>
  );
}

function BottomAction({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon?: boolean;
}) {
  return (
    <div className="sticky bottom-0 mt-auto pt-8 pb-2">
      <Button
        size="lg"
        onClick={onClick}
        className="h-14 w-full rounded-full text-base font-extrabold shadow-[var(--shadow-soft)]"
      >
        {icon && <Sparkles className="mr-2 h-5 w-5" />}
        {label}
      </Button>
    </div>
  );
}
