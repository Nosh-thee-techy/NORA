import { useEffect } from "react";
import { useNora } from "@/store/nora";
import { DEFAULT_AVATAR_ID } from "@/lib/avatars";

/** Applies the selected companion's color theme to the whole document. */
export function AvatarTheme({ avatarId }: { avatarId?: string }) {
  const { profile, hydrated } = useNora();
  const id = avatarId ?? profile.avatarId ?? DEFAULT_AVATAR_ID;

  useEffect(() => {
    if (avatarId == null && !hydrated) return;
    document.documentElement.dataset["avatar"] = id;
    return () => {
      /* keep last theme; next mount will replace */
    };
  }, [id, avatarId, hydrated]);

  return null;
}
