export type Phase = "menstrual" | "follicular" | "ovulation" | "luteal";

export const CYCLE_LENGTH = 28;

export const PHASE_META: Record<
  Phase,
  { label: string; blurb: string; lunaName: string }
> = {
  menstrual: {
    label: "Menstruation",
    blurb: "Luna is a warm, protective ember. Rest is productive.",
    lunaName: "Ember",
  },
  follicular: {
    label: "Follicular",
    blurb: "Luna is a calm dew-drop. Energy is quietly rebuilding.",
    lunaName: "Dew",
  },
  ovulation: {
    label: "Ovulation",
    blurb: "Luna is sparkling. You may feel most radiant now.",
    lunaName: "Spark",
  },
  luteal: {
    label: "Luteal",
    blurb: "Luna is a soft cloud. Bloating and heaviness are common.",
    lunaName: "Cloud",
  },
};

export function phaseForDay(day: number): Phase {
  const d = ((day - 1) % CYCLE_LENGTH) + 1;
  if (d <= 5) return "menstrual";
  if (d <= 12) return "follicular";
  if (d <= 16) return "ovulation";
  return "luteal";
}

export const SYMPTOMS = [
  { id: "cramps", label: "Bad Cramps" },
  { id: "endo-belly", label: "Endo Belly" },
  { id: "leg-pain", label: "Radiating Leg Pain" },
  { id: "heavy-flow", label: "Heavy Flow" },
  { id: "nausea", label: "Nausea" },
] as const;

export type SymptomId = (typeof SYMPTOMS)[number]["id"];
