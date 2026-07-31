import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { phaseForDay, type Phase, type SymptomId, CYCLE_LENGTH } from "@/lib/cycle";

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
};

type NoraState = {
  cycleDay: number;
  energy: number;
  symptoms: SymptomId[];
  painPoints: PainPoint[];
  onboarded: boolean;
  profile: OnboardingProfile;
};

const STORAGE_KEY = "nora-bloom-state-v1";

export const DEFAULT_PROFILE: OnboardingProfile = {
  lastPeriodStart: null,
  cycleLength: 28,
  periodLength: 5,
  profileSymptoms: [],
  whatsappNumber: "",
  whatsappCountry: "+1",
  dailyCheckin: true,
  emergencyContact: "",
};

const DEFAULT_STATE: NoraState = {
  cycleDay: 14,
  energy: 55,
  symptoms: [],
  painPoints: [],
  onboarded: false,
  profile: DEFAULT_PROFILE,
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
  if (!profile.lastPeriodStart) return 1;
  const start = new Date(profile.lastPeriodStart + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - start.getTime()) / 86_400_000);
  if (!Number.isFinite(diff) || diff < 0) return 1;
  const len = profile.cycleLength ?? CYCLE_LENGTH;
  return Math.min(CYCLE_LENGTH, (diff % len) + 1);
}


type Ctx = NoraState & {
  phase: Phase;
  setCycleDay: (d: number) => void;
  setEnergy: (v: number) => void;
  toggleSymptom: (id: SymptomId) => void;
  addPainPoint: (p: PainPoint) => void;
  updatePainPoint: (id: string, patch: Partial<PainPoint>) => void;
  removePainPoint: (id: string) => void;
  completeOnboarding: (profile: OnboardingProfile) => void;
  resetOnboarding: () => void;
  hydrated: boolean;

};

const NoraContext = createContext<Ctx | null>(null);

export function NoraProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NoraState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...DEFAULT_STATE, ...JSON.parse(raw) });
    } catch {
      /* offline-safe: fall back to defaults */
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

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      hydrated,
      phase: phaseForDay(state.cycleDay),
      setCycleDay: (d) =>
        setState((s) => ({ ...s, cycleDay: Math.min(CYCLE_LENGTH, Math.max(1, d)) })),
      setEnergy: (v) => setState((s) => ({ ...s, energy: v })),
      toggleSymptom: (id) =>
        setState((s) => ({
          ...s,
          symptoms: s.symptoms.includes(id)
            ? s.symptoms.filter((x) => x !== id)
            : [...s.symptoms, id],
        })),
      addPainPoint: (p) => setState((s) => ({ ...s, painPoints: [...s.painPoints, p] })),
      updatePainPoint: (id, patch) =>
        setState((s) => ({
          ...s,
          painPoints: s.painPoints.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      removePainPoint: (id) =>
        setState((s) => ({ ...s, painPoints: s.painPoints.filter((p) => p.id !== id) })),
      completeOnboarding: (profile) =>
        setState((s) => ({
          ...s,
          onboarded: true,
          profile,
          cycleDay: cycleDayFromProfile(profile),
          symptoms: mapProfileSymptoms(profile.profileSymptoms),
        })),
      resetOnboarding: () => setState((s) => ({ ...s, onboarded: false })),

    }),
    [state, hydrated],
  );

  return <NoraContext.Provider value={value}>{children}</NoraContext.Provider>;
}

export function useNora() {
  const ctx = useContext(NoraContext);
  if (!ctx) throw new Error("useNora must be used inside NoraProvider");
  return ctx;
}
