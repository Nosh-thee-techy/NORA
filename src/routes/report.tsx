import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Activity, CalendarX, PillBottle, TrendingUp } from "lucide-react";
import { TopNav } from "@/components/TopNav";
import { SosScreen } from "@/components/SosScreen";
import { useNora } from "@/store/nora";
import { SYMPTOMS } from "@/lib/cycle";
import { toast } from "sonner";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "My Health Story — Doctor Advocacy Report | Nora" },
      {
        name: "description",
        content:
          "A one-page clinical triage summary of three months of cycle, pain and endometriosis screening data you can hand to your doctor.",
      },
      { property: "og:title", content: "My Health Story — Doctor Advocacy Report" },
      {
        property: "og:description",
        content:
          "Turn three months of Nora cycle logs into a clean clinical summary with pain impact metrics.",
      },
    ],
  }),
  component: ReportPage,
});

const METRICS = [
  { icon: CalendarX, label: "Days Missed Work/School", value: "3", tone: "high" },
  { icon: PillBottle, label: "NSAID Efficacy", value: "Low", tone: "high" },
  { icon: Activity, label: "Avg. Peak Pain", value: "8.2 / 10", tone: "high" },
  { icon: TrendingUp, label: "Cycles Logged", value: "3 months", tone: "ok" },
];

const TIMELINE = [
  { month: "Month 1", peak: 7, flow: "Heavy (5 days)", flags: "Bowel pain during menses" },
  { month: "Month 2", peak: 9, flow: "Heavy (6 days)", flags: "Radiating leg pain, nausea" },
  { month: "Month 3", peak: 8, flow: "Heavy (5 days)", flags: "Endo belly, pain on day 19" },
];

function ReportPage() {
  const { phase, painPoints, symptoms } = useNora();
  const [sos, setSos] = useState(false);

  return (
    <div data-phase={phase} className="min-h-screen bg-background pb-16">
      <TopNav onSos={() => setSos(true)} />

      <main className="mx-auto max-w-xl px-4">
        <section className="mt-4 rounded-4xl glass-panel p-5">
          <h1 className="text-2xl font-extrabold tracking-tight">My Health Story</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A 1-page clinical triage summary built from 3 months of your logs — written in
            the language clinicians use, so you're heard the first time.
          </p>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          {METRICS.map((m) => (
            <div key={m.label} className="rounded-3xl glass-panel p-4">
              <m.icon className="h-4 w-4 text-muted-foreground" />
              <p className="mt-2 text-xl font-extrabold">{m.value}</p>
              <p className="text-[11px] font-semibold text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </section>

        <section className="mt-4 rounded-4xl glass-panel p-5">
          <h2 className="text-sm font-bold">Cycle-by-cycle summary</h2>
          <div className="mt-3 space-y-2">
            {TIMELINE.map((t) => (
              <div key={t.month} className="rounded-2xl bg-secondary/70 p-3">
                <div className="flex items-center justify-between text-sm font-bold">
                  <span>{t.month}</span>
                  <span>Peak pain {t.peak}/10</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full phase-gradient"
                    style={{ width: `${t.peak * 10}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t.flow} • {t.flags}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-4xl glass-panel p-5">
          <h2 className="text-sm font-bold">Today's active markers</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            {symptoms.length
              ? SYMPTOMS.filter((s) => symptoms.includes(s.id))
                  .map((s) => s.label)
                  .join(" • ")
              : "No symptoms logged today."}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {painPoints.length
              ? `${painPoints.length} mapped pain point${painPoints.length === 1 ? "" : "s"}: ${[
                  ...new Set(painPoints.map((p) => p.region)),
                ].join(", ")}`
              : "No mapped pain points yet."}
          </p>
        </section>

        <section className="mt-4 rounded-4xl glass-panel p-5">
          <h2 className="text-sm font-bold">Silent screening signal</h2>
          <p className="mt-2 text-sm">
            Pattern consistent with <strong>possible endometriosis</strong>: cyclical deep
            pelvic pain, bowel involvement during menses, radiating leg pain and poor NSAID
            response. Suggested next step: referral for pelvic ultrasound / gynaecology
            review.
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Nora is not a diagnostic device. This summary supports your conversation with a
            clinician.
          </p>
        </section>

        <button
          onClick={() => toast.success("Doctor Advocacy PDF prepared for download")}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl phase-gradient py-3.5 text-sm font-bold text-primary-foreground"
        >
          <Download className="h-4 w-4" />
          Download Doctor Advocacy PDF
        </button>
      </main>

      <SosScreen open={sos} onClose={() => setSos(false)} />
    </div>
  );
}
