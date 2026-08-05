import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_AVATAR_ID, avatarById } from "@/lib/avatars";
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
  nextMonthToCredit,
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

const STORAGE_KEY = "nora-bloom-state-v3";
const LEGACY_KEYS = ["nora-bloom-state-v2", "nora-bloom-state-v1"] as const;

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

function mapProfileSymptoms(ids: string[]): SymptomId[] {
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

/** Require a real companion choice + period date before skipping onboarding. */
function isOnboardingComplete(
  onboarded: boolean | undefined,
  profile: OnboardingProfile,
): boolean {
  if (!onboarded) return false;
  const avatarOk = Boolean(profile.avatarId && avatarById(profile.avatarId).id === profile.avatarId);
  const reasonsOk = Array.isArray(profile.avatarReasons) && profile.avatarReasons.length > 0;
  const periodOk = Boolean(profile.lastPeriodStart);
  return avatarOk && reasonsOk && periodOk;
}

function normalizeState(parsed: Partial<NoraState>): NoraState {
  const profile: OnboardingProfile = {
    ...DEFAULT_PROFILE,
    ...(parsed.profile ?? {}),
    avatarId: parsed.profile?.avatarId || DEFAULT_AVATAR_ID,
    avatarReasons: Array.isArray(parsed.profile?.avatarReasons)
      ? parsed.profile!.avatarReasons
      : [],
  };

  const base: NoraState = {
    ...DEFAULT_STATE,
    ...parsed,
    profile,
    monthLogs: Array.isArray(parsed.monthLogs) ? parsed.monthLogs : [],
    recoveryMode: !!parsed.recoveryMode,
    resilienceUnlocked: !!parsed.resilienceUnlocked,
    painPoints: Array.isArray(parsed.painPoints) ? parsed.painPoints : [],
    symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : [],
    onboarded: false,
  };

  return withRisk({
    ...base,
    onboarded: isOnboardingComplete(parsed.onboarded, profile),
  });
}

function readStoredState(): NoraState | null {
  if (typeof window === "undefined") return null;
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      for (const key of LEGACY_KEYS) {
        raw = localStorage.getItem(key);
        if (raw) break;
      }
    }
    if (!raw) return null;
    return normalizeState(JSON.parse(raw) as Partial<NoraState>);
  } catch {
    return null;
  }
}

type Ctx = NoraState & {
  phase: Phase;
  setCycleDay: (d: number) => void;
  setEnergy: (v: number) => void;
  toggleSymptom: (id: SymptomId) => void;
  addPainPoint: (p: PainPoint) => void;
  updatePainPoint: (id: string, patch: Partial<PainPoint>) => void;
  removePainPoint: (id: string) => void;
  updateProfile: (patch: Partial<OnboardingProfile>) => void;
  completeOnboarding: (profile: OnboardingProfile, opts?: { energy?: number }) => void;
  resetOnboarding: () => void;
  setRecoveryMode: (on: boolean) => void;
  logTodaySignals: () => void;
  /** Credit the next month toward the 3-month resilience path; returns credited month key */
  recordPatternMonth: () => string;
  endoRiskReason: string;
  patternMonthsLogged: number;
  hydrated: boolean;
};

const NoraContext = createContext<Ctx | null>(null);

export function NoraProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NoraState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  /** Prevent writing default state over localStorage before the load effect runs. */
  const persistEnabled = useRef(false);

  useEffect(() => {
    const stored = readStoredState();
    if (stored) setState(stored);
    persistEnabled.current = true;
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !persistEnabled.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      // Keep legacy key in sync so older builds still see the companion choice
      localStorage.setItem("nora-bloom-state-v2", JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
  }, [state, hydrated]);

  const setCycleDay = useCallback((d: number) => {
    setState((s) => {
      const len = resolveCycleLength(s.profile.cycleLength);
      const next = ((d - 1) % len + len) % len;
      return { ...s, cycleDay: next + 1 };
    });
  }, []);

  const setEnergy = useCallback((v: number) => {
    setState((s) => ({ ...s, energy: v }));
  }, []);

  const toggleSymptom = useCallback((id: SymptomId) => {
    setState((s) => {
      const symptoms = s.symptoms.includes(id)
        ? s.symptoms.filter((x) => x !== id)
        : [...s.symptoms, id];
      return { ...s, symptoms };
    });
  }, []);

  const addPainPoint = useCallback((p: PainPoint) => {
    setState((s) => {
      const painPoints = [...s.painPoints, p];
      const monthLogs = upsertMonthLog(s.monthLogs, {
        month: currentMonthKey(),
        peakPain: Math.max(...painPoints.map((x) => x.intensity), p.intensity),
      });
      return withRisk({ ...s, painPoints, monthLogs });
    });
  }, []);

  const updatePainPoint = useCallback((id: string, patch: Partial<PainPoint>) => {
    setState((s) => ({
      ...s,
      painPoints: s.painPoints.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  }, []);

  const removePainPoint = useCallback((id: string) => {
    setState((s) => ({ ...s, painPoints: s.painPoints.filter((p) => p.id !== id) }));
  }, []);

  const updateProfile = useCallback((patch: Partial<OnboardingProfile>) => {
    setState((s) => ({
      ...s,
      profile: { ...s.profile, ...patch },
    }));
  }, []);

  const completeOnboarding = useCallback((profile: OnboardingProfile, opts?: { energy?: number }) => {
    const normalized: OnboardingProfile = {
      ...DEFAULT_PROFILE,
      ...profile,
      avatarId: profile.avatarId || DEFAULT_AVATAR_ID,
      avatarReasons: Array.isArray(profile.avatarReasons) ? profile.avatarReasons : [],
    };
    setState((s) => {
      const next: NoraState = {
        ...s,
        onboarded: true,
        profile: normalized,
        energy: opts?.energy ?? s.energy,
        cycleDay: cycleDayFromProfile(normalized),
        symptoms: mapProfileSymptoms(normalized.profileSymptoms),
      };
      // Eager write so a fast navigation can't lose the companion
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        localStorage.setItem("nora-bloom-state-v2", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const resetOnboarding = useCallback(() => {
    setState((s) => ({
      ...s,
      onboarded: false,
    }));
  }, []);

  const setRecoveryMode = useCallback((on: boolean) => {
    setState((s) => ({ ...s, recoveryMode: on }));
  }, []);

  const logTodaySignals = useCallback(() => {
    setState((s) => {
      const peakFromPain = s.painPoints.reduce((m, p) => Math.max(m, p.intensity), 0);
      const peakPain = Math.max(
        peakFromPain,
        s.symptoms.includes("cramps") ? 7 : 0,
        s.symptoms.includes("leg-pain") ? 7 : 0,
      );
      const patch = {
        month: currentMonthKey(),
        peakPain,
        endoBellyDays: s.symptoms.includes("endo-belly") ? 1 : 0,
        heavyFlow: s.symptoms.includes("heavy-flow"),
        missedFunction: peakPain >= 8,
      };
      const existing = s.monthLogs.find((m) => m.month === patch.month);
      if (
        existing &&
        existing.peakPain >= patch.peakPain &&
        existing.endoBellyDays >= patch.endoBellyDays &&
        existing.heavyFlow === (existing.heavyFlow || patch.heavyFlow) &&
        existing.missedFunction === (existing.missedFunction || patch.missedFunction)
      ) {
        return s;
      }
      return withRisk({ ...s, monthLogs: upsertMonthLog(s.monthLogs, patch) });
    });
  }, []);

  const recordPatternMonth = useCallback(() => {
    let credited = currentMonthKey();
    setState((s) => {
      credited = nextMonthToCredit(s.monthLogs);
      const peakFromPain = s.painPoints.reduce((m, p) => Math.max(m, p.intensity), 0);
      const peakPain = Math.max(
        peakFromPain,
        s.symptoms.includes("cramps") ? 8 : 0,
        s.symptoms.includes("leg-pain") ? 7 : 0,
        8,
      );
      const monthLogs = upsertMonthLog(s.monthLogs, {
        month: credited,
        peakPain,
        endoBellyDays: 3,
        heavyFlow: true,
        missedFunction: true,
      });
      return withRisk({ ...s, monthLogs });
    });
    return credited;
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      hydrated,
      phase: phaseForDay(state.cycleDay, {
        cycleLength: state.profile.cycleLength,
        periodLength: state.profile.periodLength,
      }),
      setCycleDay,
      setEnergy,
      toggleSymptom,
      addPainPoint,
      updatePainPoint,
      removePainPoint,
      updateProfile,
      completeOnboarding,
      resetOnboarding,
      setRecoveryMode,
      logTodaySignals,
      recordPatternMonth,
      endoRiskReason: evaluateEndoRisk(state.monthLogs).reason,
      patternMonthsLogged: state.monthLogs.length,
    }),
    [
      state,
      hydrated,
      setCycleDay,
      setEnergy,
      toggleSymptom,
      addPainPoint,
      updatePainPoint,
      removePainPoint,
      updateProfile,
      completeOnboarding,
      resetOnboarding,
      setRecoveryMode,
      logTodaySignals,
      recordPatternMonth,
    ],
  );

  return <NoraContext.Provider value={value}>{children}</NoraContext.Provider>;
}

export function useNora() {
  const ctx = useContext(NoraContext);
  if (!ctx) throw new Error("useNora must be used inside NoraProvider");
  return ctx;
}
