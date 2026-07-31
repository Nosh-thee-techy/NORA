import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_AVATAR_ID } from "@/lib/avatars";
import {
  phaseForDay,
  cycleDayFromLastPeriod,
  resolveCycleLength,
  type Phase,
  type SymptomId,
} from "@/lib/cycle";
import {
  currentMonthKey,
  evaluateEndoRisk,
  upsertMonthLog,
  type MonthLog,
} from "@/lib/forecast";

export type PainPoint = {
  id: string;
  region: string;
  x: number;
  y: number;
  intensity: number;
  depth: number;
};

export type OnboardingProfile = {
  lastPeriodStart: string | null;
  cycleLength: number | null;
  periodLength: number | null;
  profileSymptoms: string[];
  whatsappNumber: string;
  whatsappCountry: string;
  dailyCheckin: boolean;
  emergencyContact: string;
  avatarId: string;
  avatarReasons: string[];
};

type NoraState = {
  cycleDay: number;
  energy: number;
  symptoms: SymptomId[];
  painPoints: PainPoint[];
  onboarded: boolean;
  profile: OnboardingProfile;
  recoveryMode: boolean;
  monthLogs: MonthLog[];
  resilienceUnlocked: boolean;
};

const STORAGE_KEY = "nora-bloom-state-v2";

export const DEFAULT_PROFILE: OnboardingProfile = {
  lastPeriodStart: null,
  cycleLength: 28,
  periodLength: 5,
  profileSymptoms: [],
  whatsappNumber: "",
  whatsappCountry: "+1",
  dailyCheckin: true,
  emergencyContact: "",
  avatarId: DEFAULT_AVATAR_ID,
  avatarReasons: [],
};

const DEFAULT_STATE: NoraState = {
  cycleDay: 14,
  energy: 55,
  symptoms: [],
  painPoints: [],
  onboarded: false,
  profile: DEFAULT_PROFILE,
  recoveryMode: false,
  monthLogs: [],
  resilienceUnlocked: false,
};

const SYMPTOM_MAP: Record<string, SymptomId> = {
  "severe-pain": "cramps",
  "standard-cramps": "cramps",
  bloating: "endo-belly",
  "radiating-pain": "leg-pain",
  "heavy-flow": "heavy-flow",
  "digestive-pain": "nausea",
};

export function mapProfileSymptoms(ids: string[]): SymptomId[] {
  const mapped = ids.map((id) => SYMPTOM_MAP[id]).filter(Boolean) as SymptomId[];
  return Array.from(new Set(mapped));
}

export function cycleDayFromProfile(profile: OnboardingProfile): number {
  return cycleDayFromLastPeriod(profile);
}

function withRisk(state: NoraState): NoraState {
  const risk = evaluateEndoRisk(state.monthLogs);
  return { ...state, resilienceUnlocked: risk.resilienceUnlocked || state.resilienceUnlocked };
}

type Ctx = NoraState & {
  phase: Phase;
  setCycleDay: (d: number) => void;
  setEnergy: (v: number) => void;
  toggleSymptom: (id: SymptomId) => void;
  addPainPoint: (p: PainPoint) => void;
  updatePainPoint: (id: string, patch: Partial<PainPoint>) => void;
  removePainPoint: (id: string) => void;
  completeOnboarding: (profile: OnboardingProfile, opts?: { energy?: number }) => void;
  resetOnboarding: () => void;
  setRecoveryMode: (on: boolean) => void;
  logTodaySignals: () => void;
  /** Intentionally credit this calendar month toward the 3-month resilience path */
  recordPatternMonth: () => void;
  endoRiskReason: string;
  patternMonthsLogged: number;
  hydrated: boolean;
};

const NoraContext = createContext<Ctx | null>(null);

export function NoraProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NoraState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("nora-bloom-state-v1");
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<NoraState>;
        setState(
          withRisk({
            ...DEFAULT_STATE,
            ...parsed,
            profile: { ...DEFAULT_PROFILE, ...(parsed.profile ?? {}) },
            monthLogs: parsed.monthLogs ?? [],
            recoveryMode: !!parsed.recoveryMode,
            resilienceUnlocked: !!parsed.resilienceUnlocked,
          }),
        );
      }
    } catch {
      /* offline-safe */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
  }, [state, hydrated]);

  const cycleLen = resolveCycleLength(state.profile.cycleLength);

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      hydrated,
      phase: phaseForDay(state.cycleDay, {
        cycleLength: state.profile.cycleLength,
        periodLength: state.profile.periodLength,
      }),
      setCycleDay: (d) =>
        setState((s) => {
          const len = resolveCycleLength(s.profile.cycleLength);
          const next = ((d - 1) % len + len) % len;
          return { ...s, cycleDay: next + 1 };
        }),
      setEnergy: (v) => setState((s) => ({ ...s, energy: v })),
      toggleSymptom: (id) =>
        setState((s) => {
          const symptoms = s.symptoms.includes(id)
            ? s.symptoms.filter((x) => x !== id)
            : [...s.symptoms, id];
          return { ...s, symptoms };
        }),
      addPainPoint: (p) =>
        setState((s) => {
          const painPoints = [...s.painPoints, p];
          const monthLogs = upsertMonthLog(s.monthLogs, {
            month: currentMonthKey(),
            peakPain: Math.max(...painPoints.map((x) => x.intensity), p.intensity),
          });
          return withRisk({ ...s, painPoints, monthLogs });
        }),
      updatePainPoint: (id, patch) =>
        setState((s) => ({
          ...s,
          painPoints: s.painPoints.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      removePainPoint: (id) =>
        setState((s) => ({ ...s, painPoints: s.painPoints.filter((p) => p.id !== id) })),
      completeOnboarding: (profile, opts) =>
        setState((s) => ({
          ...s,
          onboarded: true,
          profile,
          energy: opts?.energy ?? s.energy,
          cycleDay: cycleDayFromProfile(profile),
          symptoms: mapProfileSymptoms(profile.profileSymptoms),
        })),
      resetOnboarding: () => setState((s) => ({ ...s, onboarded: false })),
      setRecoveryMode: (on) => setState((s) => ({ ...s, recoveryMode: on })),
      logTodaySignals: () =>
        setState((s) => {
          const peakFromPain = s.painPoints.reduce((m, p) => Math.max(m, p.intensity), 0);
          const peakPain = Math.max(
            peakFromPain,
            s.symptoms.includes("cramps") ? 7 : 0,
            s.symptoms.includes("leg-pain") ? 7 : 0,
          );
          const monthLogs = upsertMonthLog(s.monthLogs, {
            month: currentMonthKey(),
            peakPain,
            endoBellyDays: s.symptoms.includes("endo-belly") ? 1 : 0,
            heavyFlow: s.symptoms.includes("heavy-flow"),
            missedFunction: peakPain >= 8,
          });
          return withRisk({ ...s, monthLogs });
        }),
      recordPatternMonth: () =>
        setState((s) => {
          const peakFromPain = s.painPoints.reduce((m, p) => Math.max(m, p.intensity), 0);
          const peakPain = Math.max(
            peakFromPain,
            s.symptoms.includes("cramps") ? 8 : 0,
            s.symptoms.includes("leg-pain") ? 7 : 0,
            7,
          );
          const monthLogs = upsertMonthLog(s.monthLogs, {
            month: currentMonthKey(),
            peakPain,
            endoBellyDays: 3,
            heavyFlow: true,
            missedFunction: true,
          });
          return withRisk({ ...s, monthLogs });
        }),
      endoRiskReason: evaluateEndoRisk(state.monthLogs).reason,
      patternMonthsLogged: state.monthLogs.length,
    }),
    [state, hydrated, cycleLen],
  );

  return <NoraContext.Provider value={value}>{children}</NoraContext.Provider>;
}

export function useNora() {
  const ctx = useContext(NoraContext);
  if (!ctx) throw new Error("useNora must be used inside NoraProvider");
  return ctx;
}
