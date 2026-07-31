import { Link, useRouterState } from "@tanstack/react-router";
import { Sprout, HeartPulse, FileText, Home, MessageCircle } from "lucide-react";
import { useNora } from "@/store/nora";
import { PHASE_META } from "@/lib/cycle";
import { cn } from "@/lib/utils";

export function TopNav({ onSos }: { onSos: () => void }) {
  const { cycleDay, phase } = useNora();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-30 glass-panel rounded-b-3xl px-4 py-3">
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-2xl phase-gradient text-primary-foreground">
            <Sprout className="h-5 w-5" />
          </span>
          <span className="text-lg font-extrabold tracking-tight">Bloom</span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
            <span className="grid h-6 w-6 place-items-center rounded-full phase-gradient text-[11px] font-bold text-primary-foreground">
              {cycleDay}
            </span>
            <span className="hidden xs:inline">Day {cycleDay} • </span>
            {PHASE_META[phase].label}
          </div>

          <button
            onClick={onSos}
            className="flex items-center gap-1.5 rounded-full bg-destructive px-3.5 py-2 text-xs font-bold text-destructive-foreground shadow-[0_0_24px_-6px_var(--sos-glow)] transition-transform active:scale-95"
          >
            <HeartPulse className="h-4 w-4" />
            SOS Flare
          </button>
        </div>
      </div>

      <nav className="mx-auto mt-3 flex max-w-xl gap-2">
        {[
          { to: "/", label: "Today", icon: Home },
          { to: "/chat", label: "Talk", icon: MessageCircle },
          { to: "/report", label: "Story", icon: FileText },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition-colors",
              pathname === item.to
                ? "phase-gradient text-primary-foreground"
                : "bg-secondary text-secondary-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
