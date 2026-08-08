/**
 * Endometriosis tracking variables module.
 *
 * Defines clinically-backed variables for endo pattern detection,
 * based on validated instruments: EHP-30, VAS, EAPP, WPAI.
 */

import type { Phase } from "@/lib/cycle";

// ── Enums / union types ──────────────────────────────────────────────

export type PainQuality =
  | "cramping"
  | "stabbing"
  | "burning"
  | "throbbing"
  | "aching"
  | "pressure";

export type BowelChange =
  | "constipation"
  | "diarrhea"
  | "blood-in-stool"
  | "painful-gas";

export type UrinarySymptom = "frequency" | "urgency" | "pain";

export type FlowLevel =
  | "none"
  | "spotting"
  | "light"
  | "moderate"
  | "heavy"
  | "flooding";

export type MoodLevel = "great" | "good" | "okay" | "low" | "very-low";

export type SleepQuality = "good" | "fair" | "poor" | "none";

export type MedicationCategory =
  | "nsaid"
  | "paracetamol"
  | "hormonal-oc"
  | "progestin"
  | "gnrh-agonist"
  | "gnrh-antagonist"
  | "other";

export type MedicationEntry = {
  category: MedicationCategory;
  name: string;
  /** Did it provide relief? null = not yet assessed */
  effective: boolean | null;
};

// ── Daily log ────────────────────────────────────────────────────────

export type EndoDailyLog = {
  date: string; // yyyy-MM-dd
  cycleDay: number;
  phase: Phase;

  // Pain variables (VAS-inspired, 0–10)
  painOverall: number;
  painDysmenorrhea: number;
  painDyspareunia: number; // 0 = N/A
  painDyschezia: number;
  painDysuria: number;
  painBackRadiating: number;

  // Pain quality
  painQualities: PainQuality[];

  // GI & urinary
  bloatingSeverity: number; // 0–10
  bowelChanges: BowelChange[];
  urinarySymptoms: UrinarySymptom[];

  // Flow & bleeding
  flowIntensity: FlowLevel;
  clotting: boolean;
  intermenstrualBleeding: boolean;

  // Fatigue & energy
  fatigueSeverity: number; // 0–10
  energyLevel: number; // 0–100

  // Mood & mental health
  mood: MoodLevel;
  anxietySeverity: number; // 0–10
  brainFog: boolean;

  // Functional impact
  missedWork: boolean;
  reducedActivity: boolean;
  sleepQuality: SleepQuality;

  // Medication
  medications: MedicationEntry[];

  // Free-text
  notes: string;
};

// ── Defaults ─────────────────────────────────────────────────────────

export const DEFAULT_DAILY_LOG: Omit<EndoDailyLog, "date" | "cycleDay" | "phase"> = {
  painOverall: 0,
  painDysmenorrhea: 0,
  painDyspareunia: 0,
  painDyschezia: 0,
  painDysuria: 0,
  painBackRadiating: 0,
  painQualities: [],
  bloatingSeverity: 0,
  bowelChanges: [],
  urinarySymptoms: [],
  flowIntensity: "none",
  clotting: false,
  intermenstrualBleeding: false,
  fatigueSeverity: 0,
  energyLevel: 50,
  mood: "okay",
  anxietySeverity: 0,
  brainFog: false,
  missedWork: false,
  reducedActivity: false,
  sleepQuality: "good",
  medications: [],
  notes: "",
};

// ── Helpers ──────────────────────────────────────────────────────────

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Maximum number of daily log entries to retain (≈90 days / 3 cycles). */
const MAX_DAILY_LOGS = 90;

/** Merge or insert a daily log entry. */
export function upsertDailyLog(
  logs: EndoDailyLog[],
  patch: Partial<EndoDailyLog> & { date: string; cycleDay: number; phase: Phase },
): EndoDailyLog[] {
  const existing = logs.find((l) => l.date === patch.date);

  if (!existing) {
    const entry: EndoDailyLog = {
      ...DEFAULT_DAILY_LOG,
      ...patch,
    };
    return [...logs, entry].slice(-MAX_DAILY_LOGS);
  }

  return logs.map((l) =>
    l.date === patch.date
      ? {
          ...l,
          ...patch,
          // Take max of pain scores
          painOverall: Math.max(l.painOverall, patch.painOverall ?? 0),
          painDysmenorrhea: Math.max(l.painDysmenorrhea, patch.painDysmenorrhea ?? 0),
          painDyspareunia: Math.max(l.painDyspareunia, patch.painDyspareunia ?? 0),
          painDyschezia: Math.max(l.painDyschezia, patch.painDyschezia ?? 0),
          painDysuria: Math.max(l.painDysuria, patch.painDysuria ?? 0),
          painBackRadiating: Math.max(l.painBackRadiating, patch.painBackRadiating ?? 0),
          bloatingSeverity: Math.max(l.bloatingSeverity, patch.bloatingSeverity ?? 0),
          fatigueSeverity: Math.max(l.fatigueSeverity, patch.fatigueSeverity ?? 0),
          anxietySeverity: Math.max(l.anxietySeverity, patch.anxietySeverity ?? 0),
          // Merge array fields (deduplicate)
          painQualities: Array.from(new Set([...l.painQualities, ...(patch.painQualities ?? [])])),
          bowelChanges: Array.from(new Set([...l.bowelChanges, ...(patch.bowelChanges ?? [])])),
          urinarySymptoms: Array.from(new Set([...l.urinarySymptoms, ...(patch.urinarySymptoms ?? [])])),
          medications: mergeMedications(l.medications, patch.medications ?? []),
          // Boolean OR — once flagged, stays flagged for the day
          missedWork: l.missedWork || !!patch.missedWork,
          reducedActivity: l.reducedActivity || !!patch.reducedActivity,
          clotting: l.clotting || !!patch.clotting,
          intermenstrualBleeding: l.intermenstrualBleeding || !!patch.intermenstrualBleeding,
          brainFog: l.brainFog || !!patch.brainFog,
        }
      : l,
  );
}

function mergeMedications(a: MedicationEntry[], b: MedicationEntry[]): MedicationEntry[] {
  const byKey = new Map(a.map((m) => [`${m.category}:${m.name}`, m]));
  for (const m of b) {
    byKey.set(`${m.category}:${m.name}`, m);
  }
  return Array.from(byKey.values());
}

// ── Cyclical pattern detection ───────────────────────────────────────

export type CyclicalPattern = {
  /** Does pain correlate with menstrual/luteal phases? */
  painIsCyclical: boolean;
  /** Average pain in each phase (from daily logs). */
  avgPainByPhase: Record<Phase, number>;
  /** Ratio: (menstrual+luteal avg) vs (follicular+ovulation avg). Higher = more cyclical. */
  cyclicalityRatio: number;
  /** Plain-text summary for the model. */
  summary: string;
};

/** Detect whether pain patterns follow the menstrual cycle. */
export function detectCyclicalPattern(logs: EndoDailyLog[]): CyclicalPattern {
  if (logs.length < 14) {
    return {
      painIsCyclical: false,
      avgPainByPhase: { menstrual: 0, follicular: 0, ovulation: 0, luteal: 0 },
      cyclicalityRatio: 0,
      summary: "Not enough daily logs to detect cyclical patterns (need ≥14 days).",
    };
  }

  const phaseGroups: Record<Phase, number[]> = {
    menstrual: [],
    follicular: [],
    ovulation: [],
    luteal: [],
  };

  for (const log of logs) {
    phaseGroups[log.phase].push(log.painOverall);
  }

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  const avgPainByPhase: Record<Phase, number> = {
    menstrual: Math.round(avg(phaseGroups.menstrual) * 10) / 10,
    follicular: Math.round(avg(phaseGroups.follicular) * 10) / 10,
    ovulation: Math.round(avg(phaseGroups.ovulation) * 10) / 10,
    luteal: Math.round(avg(phaseGroups.luteal) * 10) / 10,
  };

  const highPhaseAvg = (avgPainByPhase.menstrual + avgPainByPhase.luteal) / 2;
  const lowPhaseAvg = (avgPainByPhase.follicular + avgPainByPhase.ovulation) / 2;
  const cyclicalityRatio = lowPhaseAvg > 0 ? Math.round((highPhaseAvg / lowPhaseAvg) * 100) / 100 : highPhaseAvg > 0 ? 10 : 0;

  // A ratio ≥ 1.5 suggests meaningful cyclical pain pattern
  const painIsCyclical = cyclicalityRatio >= 1.5;

  let summary: string;
  if (painIsCyclical && cyclicalityRatio >= 3) {
    summary = `Strong cyclical pain pattern detected. Pain in menstrual/luteal phases (avg ${highPhaseAvg.toFixed(1)}/10) is ${cyclicalityRatio.toFixed(1)}× higher than follicular/ovulation phases (avg ${lowPhaseAvg.toFixed(1)}/10). This pattern is highly consistent with endometriosis.`;
  } else if (painIsCyclical) {
    summary = `Moderate cyclical pain pattern detected. Menstrual/luteal pain (avg ${highPhaseAvg.toFixed(1)}/10) is ${cyclicalityRatio.toFixed(1)}× higher than other phases (avg ${lowPhaseAvg.toFixed(1)}/10). Worth discussing with a clinician.`;
  } else {
    summary = `No strong cyclical pain pattern detected. Pain is relatively consistent across phases (menstrual: ${avgPainByPhase.menstrual}, follicular: ${avgPainByPhase.follicular}, ovulation: ${avgPainByPhase.ovulation}, luteal: ${avgPainByPhase.luteal}).`;
  }

  return { painIsCyclical, avgPainByPhase, cyclicalityRatio, summary };
}

// ── Composite endo risk scoring ──────────────────────────────────────

export type EndoRiskResult = {
  /** 0–100 composite risk score */
  score: number;
  /** Category label */
  category: "Low" | "Moderate" | "High" | "Very High";
  /** Flags that contributed to the score. */
  flags: string[];
  /** Human-readable summary for the model and UI. */
  summary: string;
};

/**
 * Compute a composite endometriosis screening risk score from daily logs.
 *
 * Scoring is based on:
 * - Pain severity & cyclicality (0–30 pts)
 * - Multi-organ involvement — GI + urinary (0–20 pts)
 * - Functional impact (0–20 pts)
 * - Progressive worsening (0–15 pts)
 * - Symptom constellation (0–15 pts)
 */
export function computeEndoRiskScore(logs: EndoDailyLog[]): EndoRiskResult {
  if (logs.length < 7) {
    return {
      score: 0,
      category: "Low",
      flags: [],
      summary: "Not enough data to compute risk score (need ≥7 daily logs).",
    };
  }

  const flags: string[] = [];
  let score = 0;

  // 1. Pain severity & cyclicality (0–30)
  const pattern = detectCyclicalPattern(logs);
  const avgOverallPain = logs.reduce((s, l) => s + l.painOverall, 0) / logs.length;

  if (avgOverallPain >= 7) {
    score += 15;
    flags.push(`High average pain (${avgOverallPain.toFixed(1)}/10)`);
  } else if (avgOverallPain >= 4) {
    score += 8;
    flags.push(`Moderate average pain (${avgOverallPain.toFixed(1)}/10)`);
  }

  if (pattern.painIsCyclical) {
    score += pattern.cyclicalityRatio >= 3 ? 15 : 10;
    flags.push(`Cyclical pain pattern (ratio: ${pattern.cyclicalityRatio.toFixed(1)}×)`);
  }

  // 2. Multi-organ involvement (0–20)
  const daysWithGI = logs.filter((l) => l.painDyschezia >= 3 || l.bowelChanges.length > 0).length;
  const daysWithUrinary = logs.filter((l) => l.painDysuria >= 3 || l.urinarySymptoms.length > 0).length;
  const giRatio = daysWithGI / logs.length;
  const urinaryRatio = daysWithUrinary / logs.length;

  if (giRatio >= 0.3) {
    score += 10;
    flags.push(`Frequent GI symptoms (${Math.round(giRatio * 100)}% of logged days)`);
  } else if (giRatio >= 0.1) {
    score += 5;
  }

  if (urinaryRatio >= 0.3) {
    score += 10;
    flags.push(`Frequent urinary symptoms (${Math.round(urinaryRatio * 100)}% of logged days)`);
  } else if (urinaryRatio >= 0.1) {
    score += 5;
  }

  // 3. Functional impact (0–20)
  const daysMissed = logs.filter((l) => l.missedWork).length;
  const daysReduced = logs.filter((l) => l.reducedActivity).length;
  const poorSleepDays = logs.filter((l) => l.sleepQuality === "poor" || l.sleepQuality === "none").length;

  if (daysMissed >= 3) {
    score += 10;
    flags.push(`${daysMissed} days missed work/school`);
  } else if (daysMissed >= 1) {
    score += 5;
  }

  if (daysReduced / logs.length >= 0.3) {
    score += 5;
    flags.push(`Reduced activity on ${Math.round((daysReduced / logs.length) * 100)}% of days`);
  }

  if (poorSleepDays / logs.length >= 0.3) {
    score += 5;
    flags.push(`Poor sleep on ${Math.round((poorSleepDays / logs.length) * 100)}% of days`);
  }

  // 4. Progressive worsening (0–15)
  if (logs.length >= 28) {
    const half = Math.floor(logs.length / 2);
    const firstHalf = logs.slice(0, half);
    const secondHalf = logs.slice(half);
    const firstAvg = firstHalf.reduce((s, l) => s + l.painOverall, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, l) => s + l.painOverall, 0) / secondHalf.length;

    if (secondAvg > firstAvg + 1.5) {
      score += 15;
      flags.push(`Progressive pain worsening (+${(secondAvg - firstAvg).toFixed(1)} over period)`);
    } else if (secondAvg > firstAvg + 0.5) {
      score += 7;
      flags.push("Slight upward pain trend");
    }
  }

  // 5. Symptom constellation (0–15)
  const hasDeepEndoTriad =
    logs.some((l) => l.painDyschezia >= 5) &&
    logs.some((l) => l.painDysuria >= 5) &&
    logs.some((l) => l.painBackRadiating >= 5);

  if (hasDeepEndoTriad) {
    score += 10;
    flags.push("Deep endo triad present (dyschezia + dysuria + back/leg pain)");
  }

  const hasDyspareunia = logs.some((l) => l.painDyspareunia >= 5);
  if (hasDyspareunia) {
    score += 5;
    flags.push("Significant dyspareunia reported");
  }

  // Clamp to 100
  score = Math.min(100, score);

  const category: EndoRiskResult["category"] =
    score >= 70 ? "Very High" : score >= 45 ? "High" : score >= 25 ? "Moderate" : "Low";

  const summary =
    score >= 45
      ? `Composite screening score: ${score}/100 (${category}). ${flags.length} risk signals detected: ${flags.join("; ")}. This data should be shared with a healthcare provider for further evaluation.`
      : score >= 25
        ? `Composite screening score: ${score}/100 (${category}). Some signals present: ${flags.join("; ")}. Continue logging to build a clearer picture.`
        : `Composite screening score: ${score}/100 (${category}). ${flags.length > 0 ? `Minor signals: ${flags.join("; ")}.` : "No significant risk signals detected."} Keep logging for pattern detection.`;

  return { score, category, flags, summary };
}

// ── AI context builder ───────────────────────────────────────────────

/**
 * Build a structured context string from endo daily logs for the AI model.
 * This replaces the simple "cycle day + symptoms" context with rich clinical data.
 */
export function buildEndoContext(
  logs: EndoDailyLog[],
  opts: {
    cycleDay: number;
    phase: Phase;
    energy: number;
    currentSymptoms: string[];
  },
): string {
  const sections: string[] = [];

  // Current state
  sections.push(
    `CURRENT STATE: Cycle day ${opts.cycleDay} (${opts.phase} phase), energy ${opts.energy}%, active symptoms: ${opts.currentSymptoms.length > 0 ? opts.currentSymptoms.join(", ") : "none"}.`,
  );

  if (logs.length === 0) {
    sections.push("DAILY LOGS: No daily endometriosis logs recorded yet.");
    return sections.join("\n\n");
  }

  // Recent daily logs (last 7 days summary)
  const recent = logs.slice(-7);
  const recentSummary = recent
    .map((l) => {
      const parts = [`${l.date} (Day ${l.cycleDay}, ${l.phase}): pain ${l.painOverall}/10`];
      if (l.painDysmenorrhea > 0) parts.push(`dysmenorrhea ${l.painDysmenorrhea}/10`);
      if (l.painDyschezia > 0) parts.push(`dyschezia ${l.painDyschezia}/10`);
      if (l.painDysuria > 0) parts.push(`dysuria ${l.painDysuria}/10`);
      if (l.painDyspareunia > 0) parts.push(`dyspareunia ${l.painDyspareunia}/10`);
      if (l.painBackRadiating > 0) parts.push(`back/leg pain ${l.painBackRadiating}/10`);
      if (l.bloatingSeverity > 0) parts.push(`bloating ${l.bloatingSeverity}/10`);
      if (l.fatigueSeverity > 0) parts.push(`fatigue ${l.fatigueSeverity}/10`);
      if (l.bowelChanges.length > 0) parts.push(`bowel: ${l.bowelChanges.join(", ")}`);
      if (l.urinarySymptoms.length > 0) parts.push(`urinary: ${l.urinarySymptoms.join(", ")}`);
      if (l.flowIntensity !== "none") parts.push(`flow: ${l.flowIntensity}`);
      if (l.clotting) parts.push("clotting");
      if (l.missedWork) parts.push("MISSED WORK");
      if (l.reducedActivity) parts.push("reduced activity");
      if (l.medications.length > 0) {
        const meds = l.medications.map((m) => `${m.name} (${m.category}, ${m.effective === null ? "unknown efficacy" : m.effective ? "effective" : "not effective"})`);
        parts.push(`meds: ${meds.join("; ")}`);
      }
      if (l.mood !== "okay") parts.push(`mood: ${l.mood}`);
      if (l.brainFog) parts.push("brain fog");
      if (l.sleepQuality !== "good") parts.push(`sleep: ${l.sleepQuality}`);
      return parts.join(", ");
    })
    .join("\n  ");

  sections.push(`LAST 7 DAYS:\n  ${recentSummary}`);

  // Cyclical pattern analysis
  const pattern = detectCyclicalPattern(logs);
  sections.push(
    `CYCLICAL PATTERN ANALYSIS (${logs.length} days logged):\n  ${pattern.summary}\n  Phase averages — menstrual: ${pattern.avgPainByPhase.menstrual}/10, follicular: ${pattern.avgPainByPhase.follicular}/10, ovulation: ${pattern.avgPainByPhase.ovulation}/10, luteal: ${pattern.avgPainByPhase.luteal}/10`,
  );

  // Composite risk score
  const risk = computeEndoRiskScore(logs);
  sections.push(
    `COMPOSITE ENDO SCREENING SCORE: ${risk.score}/100 (${risk.category})\n  ${risk.summary}`,
  );

  // Medication summary
  const allMeds = new Map<string, { count: number; effective: number; ineffective: number; unknown: number }>();
  for (const log of logs) {
    for (const m of log.medications) {
      const key = `${m.category}:${m.name}`;
      const entry = allMeds.get(key) ?? { count: 0, effective: 0, ineffective: 0, unknown: 0 };
      entry.count++;
      if (m.effective === true) entry.effective++;
      else if (m.effective === false) entry.ineffective++;
      else entry.unknown++;
      allMeds.set(key, entry);
    }
  }

  if (allMeds.size > 0) {
    const medLines = Array.from(allMeds.entries())
      .map(([key, v]) => {
        const [cat, name] = key.split(":");
        return `${name} (${cat}): used ${v.count} days, effective ${v.effective}×, not effective ${v.ineffective}×`;
      })
      .join("\n  ");
    sections.push(`MEDICATION HISTORY:\n  ${medLines}`);
  }

  // Functional impact summary
  const totalDays = logs.length;
  const missedDays = logs.filter((l) => l.missedWork).length;
  const reducedDays = logs.filter((l) => l.reducedActivity).length;
  const poorSleep = logs.filter((l) => l.sleepQuality === "poor" || l.sleepQuality === "none").length;
  const avgFatigue = logs.reduce((s, l) => s + l.fatigueSeverity, 0) / totalDays;

  sections.push(
    `FUNCTIONAL IMPACT (over ${totalDays} logged days):\n  Days missed work/school: ${missedDays}\n  Days with reduced activity: ${reducedDays}\n  Days with poor/no sleep: ${poorSleep}\n  Average fatigue: ${avgFatigue.toFixed(1)}/10`,
  );

  return sections.join("\n\n");
}
