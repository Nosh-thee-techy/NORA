export type Phase = "menstrual" | "follicular" | "ovulation" | "luteal";

const CYCLE_LENGTH = 28;
const DEFAULT_PERIOD_LENGTH = 5;

export const PHASE_META: Record<
  Phase,
  { label: string; blurb: string; lunaName: string }
> = {
  menstrual: {
    label: "Menstruation",
    blurb: "Nora holds a warm, protective ember. Rest is productive.",
    lunaName: "Ember",
  },
  follicular: {
    label: "Follicular",
    blurb: "Nora is a calm dew-drop. Energy is quietly rebuilding.",
    lunaName: "Dew",
  },
  ovulation: {
    label: "Ovulation",
    blurb: "Nora is sparkling. You may feel most radiant now.",
    lunaName: "Spark",
  },
  luteal: {
    label: "Luteal",
    blurb: "Nora is a soft cloud. Bloating and heaviness are common.",
    lunaName: "Cloud",
  },
};

export type CycleProfileInput = {
  lastPeriodStart: string | null;
  cycleLength: number | null;
  periodLength: number | null;
};

export function resolveCycleLength(cycleLength: number | null | undefined): number {
  const n = cycleLength ?? CYCLE_LENGTH;
  return Math.min(45, Math.max(21, n));
}

export function resolvePeriodLength(periodLength: number | null | undefined): number {
  const n = periodLength ?? DEFAULT_PERIOD_LENGTH;
  return Math.min(10, Math.max(2, n));
}

/** Parse a yyyy-MM-dd profile date as local midnight. */
function parseProfileDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function daysBetween(a: Date, b: Date): number {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.floor(ms / 86_400_000);
}

/**
 * Cycle day (1-based) from the user's last period start — not from the 1st of the month.
 * Example: last start = 26th, cycle = 28 → about a month later the next period is expected
 * around the 26th again.
 */
export function cycleDayFromLastPeriod(
  profile: CycleProfileInput,
  onDate: Date = new Date(),
): number {
  const start = parseProfileDate(profile.lastPeriodStart);
  const len = resolveCycleLength(profile.cycleLength);
  if (!start) return 1;
  const diff = daysBetween(start, onDate);
  if (!Number.isFinite(diff) || diff < 0) return 1;
  return (diff % len) + 1;
}

export function phaseForDay(
  day: number,
  opts?: { cycleLength?: number | null; periodLength?: number | null },
): Phase {
  const len = resolveCycleLength(opts?.cycleLength);
  const period = Math.min(resolvePeriodLength(opts?.periodLength), len - 1);
  const d = ((day - 1) % len) + 1;

  if (d <= period) return "menstrual";

  // Ovulation ~ mid-cycle (roughly 14 days before next period in a classic 28-day cycle)
  const ovulationCenter = Math.max(period + 2, len - 14);
  const ovulationStart = Math.max(period + 1, ovulationCenter - 1);
  const ovulationEnd = Math.min(len - 1, ovulationCenter + 2);

  if (d < ovulationStart) return "follicular";
  if (d <= ovulationEnd) return "ovulation";
  return "luteal";
}

type CycleDayCell = {
  date: Date;
  cycleDay: number;
  phase: Phase;
  isToday: boolean;
  isPeriod: boolean;
  isPredictedNextPeriod: boolean;
};

export type CycleWindow = {
  cycleLength: number;
  periodLength: number;
  cycleStart: Date | null;
  nextPeriodStart: Date | null;
  days: CycleDayCell[];
  insight: string;
};

/** Build the current cycle window aligned to last period start (+ period length). */
export function buildCycleWindow(
  profile: CycleProfileInput,
  onDate: Date = new Date(),
): CycleWindow {
  const cycleLength = resolveCycleLength(profile.cycleLength);
  const periodLength = resolvePeriodLength(profile.periodLength);
  const anchor = parseProfileDate(profile.lastPeriodStart);
  const today = startOfDay(onDate);

  if (!anchor) {
    const days: CycleDayCell[] = Array.from({ length: cycleLength }, (_, i) => {
      const cycleDay = i + 1;
      const phase = phaseForDay(cycleDay, { cycleLength, periodLength });
      return {
        date: addDays(today, i - Math.floor(cycleLength / 2)),
        cycleDay,
        phase,
        isToday: cycleDay === Math.floor(cycleLength / 2) + 1,
        isPeriod: cycleDay <= periodLength,
        isPredictedNextPeriod: false,
      };
    });
    return {
      cycleLength,
      periodLength,
      cycleStart: null,
      nextPeriodStart: null,
      days,
      insight:
        "Add when your last period started so Nora can place your cycle on real dates — not the 1st of the month.",
    };
  }

  const diff = daysBetween(anchor, today);
  const cyclesElapsed = Math.max(0, Math.floor(diff / cycleLength));
  const cycleStart = addDays(anchor, cyclesElapsed * cycleLength);
  const nextPeriodStart = addDays(cycleStart, cycleLength);
  // If we're past this cycle's end somehow, still show the active window
  const activeStart =
    daysBetween(cycleStart, today) >= cycleLength ? nextPeriodStart : cycleStart;
  const activeNext = addDays(activeStart, cycleLength);

  const days: CycleDayCell[] = Array.from({ length: cycleLength }, (_, i) => {
    const date = addDays(activeStart, i);
    const cycleDay = i + 1;
    const phase = phaseForDay(cycleDay, { cycleLength, periodLength });
    return {
      date,
      cycleDay,
      phase,
      isToday: daysBetween(date, today) === 0,
      isPeriod: cycleDay <= periodLength,
      isPredictedNextPeriod: false,
    };
  });

  // Append a small peek at the predicted next period start for insight UI
  const periodEnd = addDays(activeStart, periodLength - 1);
  const insight = `Last period window: ${formatShort(activeStart)}–${formatShort(periodEnd)}. Next period likely around ${formatShort(activeNext)} (based on your ${cycleLength}-day cycle).`;

  return {
    cycleLength,
    periodLength,
    cycleStart: activeStart,
    nextPeriodStart: activeNext,
    days,
    insight,
  };
}

function formatShort(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export type SymptomCategory = "pain" | "gi-urinary" | "general";

export const SYMPTOMS = [
  // Pain
  { id: "cramps", label: "Bad Cramps", category: "pain" as SymptomCategory },
  { id: "leg-pain", label: "Radiating Leg Pain", category: "pain" as SymptomCategory },
  { id: "back-pain", label: "Back Pain", category: "pain" as SymptomCategory },
  { id: "painful-intercourse", label: "Painful Intercourse", category: "pain" as SymptomCategory },
  // GI & Urinary
  { id: "endo-belly", label: "Endo Belly", category: "gi-urinary" as SymptomCategory },
  { id: "painful-bowel", label: "Painful Bowel", category: "gi-urinary" as SymptomCategory },
  { id: "painful-urination", label: "Painful Urination", category: "gi-urinary" as SymptomCategory },
  { id: "nausea", label: "Nausea", category: "gi-urinary" as SymptomCategory },
  // General
  { id: "heavy-flow", label: "Heavy Flow", category: "general" as SymptomCategory },
  { id: "clotting", label: "Clotting", category: "general" as SymptomCategory },
  { id: "spotting", label: "Spotting", category: "general" as SymptomCategory },
  { id: "fatigue", label: "Fatigue", category: "general" as SymptomCategory },
  { id: "brain-fog", label: "Brain Fog", category: "general" as SymptomCategory },
  { id: "mood-low", label: "Low Mood", category: "general" as SymptomCategory },
] as const;

export type SymptomId = (typeof SYMPTOMS)[number]["id"];

