import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { useJob } from "@/lib/jobs";

export const Route = createFileRoute("/results/$jobId")({
  head: () => ({
    meta: [
      { title: "Here's what we found · Bhasha Buddy" },
      { name: "description", content: "Results from your AI agent's calls, with the best match highlighted." },
      { property: "og:title", content: "Here's what we found · Bhasha Buddy" },
      { property: "og:description", content: "Results from your AI agent's calls, with the best match highlighted." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalysisZone,
});

function AnalysisZone() {
  const { jobId } = Route.useParams();
  const job = useJob(jobId);
  const [toast, setToast] = useState<string | null>(null);

  if (!job) return <Shell step={2}><p className="text-muted-foreground">Loading…</p></Shell>;
  // Gate: results only when analysed
  if (job.status !== "analysed" || !job.results) return <Navigate to="/call/$jobId" params={{ jobId }} />;

  const { contacts, bestIndex, bestReason, comparison } = job.results;
  const best = contacts[bestIndex]!;
  const ordered = [bestIndex, ...contacts.map((_, i) => i).filter((i) => i !== bestIndex)];

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <Shell step={2}>
      <h1 className="font-display text-3xl font-bold text-foreground">Here's what we found</h1>
      <p className="mt-1 mb-5 text-muted-foreground">{contacts.length} calls · “{job.requirement}”</p>

      <div className="space-y-4">
        {ordered.map((i) => {
          const c = contacts[i]!;
          const isBest = i === bestIndex;
          return (
            <article key={i} className={`animate-fade-up rounded-3xl bg-card p-5 shadow-soft ${isBest ? "ring-2 ring-success" : ""}`}>
              {isBest && (
                <div className="mb-3">
                  <span className="rounded-full bg-success px-3 py-1 text-xs font-bold text-success-foreground">★ Best match for you</span>
                  <p className="mt-2 text-sm font-medium text-success">{bestReason}</p>
                </div>
              )}
              <div className="flex items-start justify-between">
                <h2 className="font-display text-xl font-bold text-foreground">{c.name} – {c.role}</h2>
                <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">🗣 {c.language}</span>
              </div>
              <p className="mt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">What they said</p>
              <p className="mt-1 text-base text-foreground">{c.summary}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {c.details.map((d) => (
                  <div key={d.label} className="rounded-xl bg-muted px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase text-muted-foreground">{d.label}</p>
                    <p className="text-sm font-bold text-foreground">{d.value}</p>
                  </div>
                ))}
              </div>
              <details className="group mt-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-primary">
                  <span className="group-open:hidden">▸ Call summary</span>
                  <span className="hidden group-open:inline">▾ Hide call summary</span>
                </summary>
                <div className="mt-3 space-y-2 border-l-2 border-border pl-3">
                  {c.transcript.map((l, k) => (
                    <p key={k} className="text-sm text-foreground">
                      <span className="font-semibold">{l.name}:</span> {l.text}
                    </p>
                  ))}
                </div>
              </details>
            </article>
          );
        })}
      </div>

      <section className="mt-6 rounded-3xl bg-accent p-5">
        <h2 className="font-display text-lg font-bold text-accent-foreground">Why {best.name} is the best match</h2>
        <ul className="mt-3 space-y-2">
          {comparison.map((c) => (
            <li key={c} className="text-sm text-accent-foreground">• {c}</li>
          ))}
        </ul>
      </section>

      <div className="mt-6 space-y-3">
        <button onClick={() => flash(`Connecting you to ${best.name}…`)} className="w-full rounded-2xl bg-gradient-primary py-4 font-display text-lg font-bold text-primary-foreground shadow-glow">
          📞 Call this one directly
        </button>
        <button onClick={() => flash(`Agent will follow up with ${best.name} and confirm a visit.`)} className="w-full rounded-2xl border-2 border-primary bg-card py-4 font-display text-lg font-bold text-primary">
          Ask the agent to follow up
        </button>
        <Link to="/" className="block w-full rounded-2xl py-3 text-center font-semibold text-muted-foreground">
          Start a new request
        </Link>
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-6 mx-auto w-fit max-w-[90%] animate-fade-up rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background shadow-glow">
          {toast}
        </div>
      )}
    </Shell>
  );
}
