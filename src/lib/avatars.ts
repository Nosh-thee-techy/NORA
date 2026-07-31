export type AvatarOption = {
  id: string;
  name: string;
  mood: string;
  url: string;
};

export const AVATARS: AvatarOption[] = [
  { id: "sadness", name: "Sadness", mood: "Tender & honest", url: "/avatars/sadness.jpg" },
  { id: "anxiety", name: "Anxiety", mood: "Wired & alert", url: "/avatars/anxiety.jpg" },
  { id: "anger", name: "Anger", mood: "Fired up", url: "/avatars/anger.jpg" },
  { id: "fear", name: "Fear", mood: "On edge", url: "/avatars/fear.jpg" },
  { id: "disgust", name: "Disgust", mood: "Over it", url: "/avatars/disgust.jpg" },
  { id: "envy", name: "Envy", mood: "Wistful", url: "/avatars/envy.jpg" },
  {
    id: "embarrassment",
    name: "Embarrassment",
    mood: "Cocooning",
    url: "/avatars/embarrassment.jpg",
  },
  { id: "ennui", name: "Ennui", mood: "Low battery", url: "/avatars/ennui.jpg" },
];

export const DEFAULT_AVATAR_ID = "sadness";

export function avatarById(id: string | null | undefined): AvatarOption {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0]!;
}
