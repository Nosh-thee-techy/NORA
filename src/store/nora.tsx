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

type NoraState = {
  userName: string;
  cycleDay: number;
  energy: number;
  symptoms: SymptomId[];
  painPoints: PainPoint[];
};

const STORAGE_KEY = "nora-bloom-state-v1";

const DEFAULT_STATE: NoraState = {
  userName: "Sarah",
  cycleDay: 14,
  energy: 55,
  symptoms: [],
  painPoints: [],
};

type Ctx = NoraState & {
  phase: Phase;
  setUserName: (name: string) => void;
  setCycleDay: (d: number) => void;
  setEnergy: (v: number) => void;
  toggleSymptom: (id: SymptomId) => void;
  addPainPoint: (p: PainPoint) => void;
  updatePainPoint: (id: string, patch: Partial<PainPoint>) => void;
  removePainPoint: (id: string) => void;
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
      setUserName: (name) => setState((s) => ({ ...s, userName: name })),
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
