import joyAsset from "@/assets/anxiety.jpg.asset.json";
import sadnessAsset from "@/assets/sadness.jpg.asset.json";
import angerAsset from "@/assets/anger.jpg.asset.json";
import fearAsset from "@/assets/fear.jpg.asset.json";
import disgustAsset from "@/assets/disgust.jpg.asset.json";
import envyAsset from "@/assets/envy.jpg.asset.json";
import embarrassmentAsset from "@/assets/embarrassment.jpg.asset.json";
import ennuiAsset from "@/assets/ennui.jpg.asset.json";

export type AvatarOption = {
  id: string;
  name: string;
  mood: string;
  url: string;
};

export const AVATARS: AvatarOption[] = [
  { id: "sadness", name: "Sadness", mood: "Tender & honest", url: sadnessAsset.url },
  { id: "anxiety", name: "Anxiety", mood: "Wired & alert", url: joyAsset.url },
  { id: "anger", name: "Anger", mood: "Fired up", url: angerAsset.url },
  { id: "fear", name: "Fear", mood: "On edge", url: fearAsset.url },
  { id: "disgust", name: "Disgust", mood: "Over it", url: disgustAsset.url },
  { id: "envy", name: "Envy", mood: "Wistful", url: envyAsset.url },
  {
    id: "embarrassment",
    name: "Embarrassment",
    mood: "Cocooning",
    url: embarrassmentAsset.url,
  },
  { id: "ennui", name: "Ennui", mood: "Low battery", url: ennuiAsset.url },
];

export const DEFAULT_AVATAR_ID = "sadness";

export function avatarById(id: string | null | undefined): AvatarOption {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0]!;
}
