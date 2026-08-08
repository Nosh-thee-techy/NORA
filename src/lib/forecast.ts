import {
  buildCycleWindow,
  daysBetween,
  phaseForDay,
  resolveCycleLength,
  resolvePeriodLength,
  startOfDay,
  type CycleProfileInput,
  type Phase,
} from "@/lib/cycle";

export type ForecastInsight = {
  daysUntilPeriod: number | null;
  inPainWindow: boolean;
  approachingPainWindow: boolean;
  warmerUi: boolean;
  prompt: string | null;
  phaseIn48h: Phase | null;
};

/** High-pain window = last 2 luteal days + menstrual days. */
export function getForecast(profile: CycleProfileInput, onDate = new Date()): ForecastInsight {
  const window = buildCycleWindow(profile, onDate);
  const len = resolveCycleLength(profile.cycleLength);
  const period = resolvePeriodLength(profile.periodLength);
  const today = startOfDay(onDate);

  if (!window.nextPeriodStart || !window.cycleStart) {
    return {
      daysUntilPeriod: null,
      inPainWindow: false,
      approachingPainWindow: false,
      warmerUi: false,
      prompt: null,
      phaseIn48h: null,
    };
  }

  const daysUntilPeriod = Math.max(0, daysBetween(today, window.nextPeriodStart));
  const cycleDay = (() => {
    const diff = daysBetween(window.cycleStart, today);
    if (diff < 0) return 1;
    return (diff % len) + 1;
  })();

  const lutealStart = Math.max(period + 1, len - 14 + 3);
  const inPainWindow = cycleDay <= period || cycleDay >= len - 1;
  const approachingPainWindow = daysUntilPeriod > 0 && daysUntilPeriod <= 2;
  const warmerUi = inPainWindow || approachingPainWindow || daysUntilPeriod <= 3;

  const phaseIn48h = phaseForDay(cycleDay + 2, {
    cycleLength: len,
    periodLength: period,
  });

  let prompt: string | null = null;
  if (approachingPainWindow) {
    prompt = `Nora predicts a challenge in about ${daysUntilPeriod * 24} hours. Let's practice supported Child's Pose today to keep pelvic pressure low.`;
  } else if (inPainWindow && cycleDay <= period) {
    prompt = "You're in a high-sensitivity window. Go slow — open the camera pose guide if you need relief.";
  }

  return {
    daysUntilPeriod,
    inPainWindow,
    approachingPainWindow,
    warmerUi,
    prompt,
    phaseIn48h,
  };
}

export type MonthLog = {
  /** yyyy-MM */
  month: string;
  peakPain: number;
  endoBellyDays: number;
  missedFunction: boolean;
  heavyFlow: boolean;
  /** Phase-level pain averages (populated from daily logs when available) */
  avgPainByPhase?: { menstrual: number; follicular: number; ovulation: number; luteal: number };
  /** Total days missed work/school in the month */
  totalDaysMissed?: number;
  /** Average fatigue severity (0–10) */
  avgFatigue?: number;
  /** Number of days with GI symptoms */
  giSymptomDays?: number;
  /** Number of days medication was taken */
  medicationDays?: number;
};

export function evaluateEndoRisk(logs: MonthLog[]): {
  highRisk: boolean;
  resilienceUnlocked: boolean;
  reason: string;
} {
  if (logs.length < 3) {
    return {
      highRisk: false,
      resilienceUnlocked: false,
      reason: "Log three months to unlock Nora's resilience marker.",
    };
  }

  const recent = logs.slice(-3);
  const highPainMonths = recent.filter((m) => m.peakPain >= 7).length;
  const endoPattern = recent.filter((m) => m.endoBellyDays >= 3).length;
  const functionImpact = recent.filter((m) => m.missedFunction).length;
  const giInvolvement = recent.filter((m) => (m.giSymptomDays ?? 0) >= 3).length;
  const highFatigue = recent.filter((m) => (m.avgFatigue ?? 0) >= 5).length;

  const highRisk =
    (highPainMonths >= 2 && (endoPattern >= 2 || functionImpact >= 2)) ||
    (highPainMonths >= 2 && giInvolvement >= 2) ||
    (highPainMonths >= 3 && highFatigue >= 2);

  return {
    highRisk,
    resilienceUnlocked: highRisk,
    reason: highRisk
      ? "Pattern noted across three months — Nora carries a resilience glow with you."
      : "Patterns are being watched gently. Keep logging when you can.",
  };
}

/** Seed or merge a month log from today's symptoms/pain. */
export function upsertMonthLog(
  logs: MonthLog[],
  patch: Partial<MonthLog> & { month: string },
): MonthLog[] {
  const existing = logs.find((l) => l.month === patch.month);
  if (!existing) {
    return [
      ...logs,
      {
        month: patch.month,
        peakPain: patch.peakPain ?? 0,
        endoBellyDays: patch.endoBellyDays ?? 0,
        missedFunction: patch.missedFunction ?? false,
        heavyFlow: patch.heavyFlow ?? false,
      },
    ].slice(-6);
  }
  return logs.map((l) =>
    l.month === patch.month
      ? {
          ...l,
          peakPain: Math.max(l.peakPain, patch.peakPain ?? 0),
          endoBellyDays: Math.max(l.endoBellyDays, patch.endoBellyDays ?? 0),
          missedFunction: l.missedFunction || !!patch.missedFunction,
          heavyFlow: l.heavyFlow || !!patch.heavyFlow,
        }
      : l,
  );
}

export function currentMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Shift a yyyy-MM key by `delta` calendar months. */
function shiftMonthKey(month: string, delta: number): string {
  const [yRaw, mRaw] = month.split("-");
  const y = Number(yRaw);
  const m = Number(mRaw);
  const d = new Date(y, m - 1 + delta, 1);
  return currentMonthKey(d);
}

/** A month counts as fully credited for the resilience path. */
function isHighRiskMonth(log: MonthLog | undefined): boolean {
  if (!log) return false;
  return log.peakPain >= 7 && log.endoBellyDays >= 3 && log.missedFunction;
}

/**
 * Pick which month to credit next: current month if not high-risk yet,
 * otherwise the nearest prior month that isn't logged as high-risk.
 */
export function nextMonthToCredit(logs: MonthLog[], onDate = new Date()): string {
  const current = currentMonthKey(onDate);
  const byMonth = new Map(logs.map((l) => [l.month, l]));
  if (!isHighRiskMonth(byMonth.get(current))) return current;
  for (let i = 1; i <= 5; i++) {
    const key = shiftMonthKey(current, -i);
    if (!isHighRiskMonth(byMonth.get(key))) return key;
  }
  return current;
}
