import sadnessUrl from "@/assets/avatars/sadness.png";
import anxietyUrl from "@/assets/avatars/anxiety.png";
import angerUrl from "@/assets/avatars/anger.png";
import fearUrl from "@/assets/avatars/fear.png";
import disgustUrl from "@/assets/avatars/disgust.png";
import envyUrl from "@/assets/avatars/envy.png";
import embarrassmentUrl from "@/assets/avatars/embarrassment.png";
import ennuiUrl from "@/assets/avatars/ennui.png";

export type AvatarOption = {
  id: string;
  name: string;
  mood: string;
  /** Short explainer shown under the focused avatar */
  description: string;
  url: string;
};

export const AVATARS: AvatarOption[] = [
  {
    id: "sadness",
    name: "Sadness",
    mood: "Tender & honest",
    description:
      "Soft and steady. Sadness helps you name hard feelings without rushing past them — a gentle companion for tender cycle days.",
    url: sadnessUrl,
  },
  {
    id: "anxiety",
    name: "Anxiety",
    mood: "Wired & alert",
    description:
      "Buzzing with care. Anxiety notices every signal early so you can plan rest, support, and check-ins before overwhelm hits.",
    url: anxietyUrl,
  },
  {
    id: "anger",
    name: "Anger",
    mood: "Fired up",
    description:
      "Protective fire. Anger validates pain that gets minimized and helps you advocate for your body when something isn’t right.",
    url: angerUrl,
  },
  {
    id: "fear",
    name: "Fear",
    mood: "On edge",
    description:
      "Cautious and prepared. Fear keeps you safe by spotting flare patterns and reminding you it’s okay to slow down.",
    url: fearUrl,
  },
  {
    id: "disgust",
    name: "Disgust",
    mood: "Over it",
    description:
      "Clear boundaries. Disgust helps you reject what drains you — guilt, push-through culture, and anything that ignores your limits.",
    url: disgustUrl,
  },
  {
    id: "envy",
    name: "Envy",
    mood: "Wistful",
    description:
      "Honest wanting. Envy names the ease or comfort you crave and turns comparison into a clue about what your body needs.",
    url: envyUrl,
  },
  {
    id: "embarrassment",
    name: "Embarrassment",
    mood: "Cocooning",
    description:
      "Quiet and private. Embarrassment makes space for messy period truths without shame — your story stays yours.",
    url: embarrassmentUrl,
  },
  {
    id: "ennui",
    name: "Ennui",
    mood: "Low battery",
    description:
      "Low-power mode. Ennui honors flat, foggy days and reminds you that rest is part of the cycle, not a failure.",
    url: ennuiUrl,
  },
];

export const DEFAULT_AVATAR_ID = "sadness";

export function avatarById(id: string | null | undefined): AvatarOption {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0]!;
}

export function avatarIndex(id: string | null | undefined): number {
  const idx = AVATARS.findIndex((a) => a.id === id);
  return idx >= 0 ? idx : 0;
}
