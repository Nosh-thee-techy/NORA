import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Download, Activity, CalendarX, PillBottle, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import { TopNav } from "@/components/TopNav";
import { SosScreen } from "@/components/SosScreen";
import { useNora } from "@/store/nora";
import { SYMPTOMS, PHASE_META } from "@/lib/cycle";
import { analyzeHealthData, loadAnalysis, saveAnalysis, loadChatMessages, type ReportData } from "@/lib/gemma";
import { toast } from "sonner";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "My Health Story — Doctor Advocacy Report | NORA" },
      {
        name: "description",
        content:
          "A one-page clinical triage summary of three months of cycle, pain and endometriosis screening data you can hand to your doctor.",
      },
      { property: "og:title", content: "My Health Story — Doctor Advocacy Report" },
      {
        property: "og:description",
        content:
          "Turn three months of NORA cycle logs into a clean clinical summary with pain impact metrics.",
      },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  const { phase, painPoints, symptoms, cycleDay, energy } = useNora();
  const [sos, setSos] = useState(false);
  
  const [analysis, setAnalysis] = useState<ReportData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  useEffect(() => {
    setAnalysis(loadAnalysis());
  }, []);

  async function generateAnalysis() {
    setIsAnalyzing(true);
    setAnalyzeError(null);
    try {
      const history = loadChatMessages();
      
      const labels = symptoms.length
        ? symptoms.map((id) => SYMPTOMS.find((s) => s.id === id)?.label ?? id).join(", ")
        : "none";
      const phaseInfo = PHASE_META[phase];
      const painContext = painPoints.length > 0
        ? `Mapped pain points: ${painPoints.map((p) => `${p.region} (intensity ${p.intensity}/10, depth ${p.depth})`).join("; ")}.`
        : "No mapped pain points.";

      const context = [
        `Current context — cycle day ${cycleDay} (${phaseInfo.label} phase), energy ${energy}%, logged symptoms: ${labels}.`,
        painContext
      ].join("\n");

      const result = await analyzeHealthData(context, history);
      setAnalysis(result);
      saveAnalysis(result);
      toast.success("Analysis generated successfully");
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Failed to analyze data.");
      toast.error("Failed to generate insight");
    } finally {
      setIsAnalyzing(false);
    }
  }

  const displayMetrics = analysis
    ? [
        { icon: CalendarX, label: "Days Missed Work/School", value: analysis.metrics.daysMissed },
        { icon: PillBottle, label: "NSAID Efficacy", value: analysis.metrics.nsaidEfficacy },
        { icon: Activity, label: "Avg. Peak Pain", value: analysis.metrics.avgPeakPain },
        { icon: TrendingUp, label: "Cycles Logged", value: analysis.metrics.cyclesLogged },
      ]
    : [
        { icon: CalendarX, label: "Days Missed Work/School", value: "—" },
        { icon: PillBottle, label: "NSAID Efficacy", value: "—" },
        { icon: Activity, label: "Avg. Peak Pain", value: "—" },
        { icon: TrendingUp, label: "Cycles Logged", value: "—" },
      ];

  const displayTimeline = analysis?.timeline ?? [];

  return (
    <div data-phase={phase} className="min-h-screen bg-background pb-16">
      <TopNav onSos={() => setSos(true)} />

      <main className="mx-auto max-w-xl px-4">
        <section className="mt-4 rounded-4xl glass-panel p-5">
          <h1 className="text-2xl font-extrabold tracking-tight">My Health Story</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A 1-page clinical triage summary built from your logs — written in
            the language clinicians use, so you're heard the first time.
          </p>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          {displayMetrics.map((m) => (
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
            {displayTimeline.length > 0 ? (
              displayTimeline.map((t) => (
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
              ))
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No cycle history extracted yet. Generate insight below to populate this.
              </p>
            )}
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
          
          {analysis ? (
            <p className="mt-2 text-sm whitespace-pre-wrap">{analysis.analysis}</p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground italic">
              No analysis generated yet.
            </p>
          )}

          {analyzeError && (
            <p className="mt-2 text-xs text-destructive">{analyzeError}</p>
          )}

          <button
            onClick={generateAnalysis}
            disabled={isAnalyzing}
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-xs font-bold text-secondary-foreground disabled:opacity-50 transition-opacity w-full sm:w-auto"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing data...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-primary" />
                {analysis ? "Regenerate Insight" : "Generate Clinical Insight"}
              </>
            )}
          </button>

          <p className="mt-4 text-[11px] text-muted-foreground">
            NORA is not a diagnostic device. This summary supports your conversation with a
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

