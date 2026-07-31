import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { SosScreen } from "@/components/SosScreen";
import { GemmaChat } from "@/components/GemmaChat";
import { useNora } from "@/store/nora";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Talk to Nora" },
      {
        name: "description",
        content:
          "Talk to Nora through voice and image replies, grounded in today's cycle and symptoms.",
      },
      { property: "og:title", content: "Talk to Nora" },
      {
        property: "og:description",
        content:
          "Private chat with Nora — spoken replies and avatar presence, powered by a local model.",
      },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const { phase, profile, onboarded, hydrated } = useNora();
  const navigate = useNavigate();
  const [sos, setSos] = useState(false);

  useEffect(() => {
    if (hydrated && !onboarded) navigate({ to: "/onboarding", replace: true });
  }, [hydrated, onboarded, navigate]);

  return (
    <div
      data-phase={phase}
      data-avatar={profile.avatarId}
      className="flex h-dvh flex-col overflow-hidden bg-background transition-colors duration-500"
    >
      <TopNav onSos={() => setSos(true)} />

      <main className="relative mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col px-4 pb-4 pt-3">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 ambient-glow" aria-hidden />
        <GemmaChat layout="page" />
      </main>

      <SosScreen open={sos} onClose={() => setSos(false)} />
    </div>
  );
}
