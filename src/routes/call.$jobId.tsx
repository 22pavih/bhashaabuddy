import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { DEMO_SPEED } from "@/lib/gnaniService";
import { useJob } from "@/lib/jobs";

export const Route = createFileRoute("/call/$jobId")({
  head: () => ({
    meta: [
      { title: "Calling… · Bhasha Buddy" },
      { name: "description", content: "Follow your AI agent's live calls and transcript." },
      { property: "og:title", content: "Calling… · Bhasha Buddy" },
      { property: "og:description", content: "Follow your AI agent's live calls and transcript." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CallingZone,
});

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  return now;
}

function CallingZone() {
  const { jobId } = Route.useParams();
  const job = useJob(jobId);
  const now = useNow();
  const scrollRef = useRef<HTMLDivElement>(null);
  const live = job?.live;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [live?.transcript.length]);

  if (!job) {
    return (
      <Shell step={1}>
        <p className="text-muted-foreground">Request not found.</p>
        <Link to="/" className="mt-4 font-semibold text-primary">← Back home</Link>
      </Shell>
    );
  }

  if (job.status === "call_completed" || job.status === "analysed") {
    const done = job.status === "analysed";
    return (
      <Shell step={done ? 2 : 1}>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="relative mb-6 grid h-24 w-24 place-items-center rounded-full bg-success/15">
            {!done && <span className="absolute inset-0 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />}
            <span className="text-4xl">{done ? "✓" : "🧠"}</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">{done ? "Analysis ready" : "Calls completed."}</h2>
          <p className="mt-2 text-muted-foreground">{done ? "We compared every option for you." : "Analysing what they said..."}</p>
          {!done && (
            <div className="mt-6 h-2 w-56 overflow-hidden rounded-full bg-muted">
              <div className="h-full animate-progress rounded-full bg-gradient-primary" />
            </div>
          )}
          {done && (
            <Link
              to="/results/$jobId"
              params={{ jobId }}
              className="mt-8 w-full rounded-2xl bg-gradient-primary py-4 font-display text-lg font-bold text-primary-foreground shadow-glow"
            >
              View results
            </Link>
          )}
        </div>
      </Shell>
    );
  }

  const events = live?.events ?? [{ id: "sent", kind: "sent" as const, label: "Requirement sent to AI agent", at: 0 }];
  const phaseSec = live ? Math.max(0, Math.floor((live.elapsedMs + (now - Date.now()) - live.phaseStartedAt) / 1000)) : 0;
  const callTimer = live && live.phase === "connected" ? fmt(Math.floor((now - job.createdAt) * DEMO_SPEED / 1000) - Math.floor(live.phaseStartedAt / 1000)) : null;
  void phaseSec;

  return (
    <Shell step={1}>
      <div className="mb-5 rounded-2xl bg-card p-4 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your requirement</p>
        <p className="mt-1 text-base font-medium text-foreground">{job.requirement}</p>
      </div>

      <h2 className="mb-3 font-display text-lg font-bold text-foreground">Live call tracker</h2>
      <ol className="relative mb-6 space-y-4 border-l-2 border-border pl-6">
        {events.map((e, i) => {
          const last = i === events.length - 1;
          const inProgress = last && e.kind !== "sent";
          return (
            <li key={e.id} className="relative animate-fade-up">
              <span
                className={`absolute -left-[33px] grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${
                  inProgress ? "bg-primary text-primary-foreground ring-4 ring-primary/25" : "bg-success text-success-foreground"
                }`}
              >
                {inProgress ? "" : "✓"}
              </span>
              <div className="flex items-center gap-3">
                <p className={`flex-1 text-base ${inProgress ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                  {e.label}
                  {inProgress && e.kind === "ringing" && "..."}
                </p>
                {inProgress && e.kind === "ringing" && <span className="animate-ring text-xl">📞</span>}
                {inProgress && e.kind === "connected" && <SoundWave />}
              </div>
              {inProgress && e.kind === "connected" && callTimer && (
                <p className="mt-1 font-mono text-sm text-primary">{callTimer}</p>
              )}
            </li>
          );
        })}
        {events.length === 1 && (
          <li className="relative text-muted-foreground">
            <span className="absolute -left-[33px] h-5 w-5 animate-pulse rounded-full bg-muted" />
            Dialing first contact…
          </li>
        )}
      </ol>

      <div className="rounded-2xl bg-card p-4 shadow-soft">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Live transcript</p>
        </div>
        <div ref={scrollRef} className="max-h-72 space-y-3 overflow-y-auto">
          {(live?.transcript ?? []).length === 0 && <p className="text-sm text-muted-foreground">Waiting for the call to connect…</p>}
          {live?.transcript.map((l, i) => (
            <div key={i} className={`flex animate-fade-up flex-col ${l.speaker === "agent" ? "items-end" : "items-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${l.speaker === "agent" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                {l.text}
              </div>
              <span className="mt-1 text-[11px] text-muted-foreground">
                {l.name} · <span className="rounded bg-accent px-1.5 py-0.5 font-semibold text-accent-foreground">{l.lang}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <button disabled className="mt-6 w-full cursor-not-allowed rounded-2xl bg-muted py-4 font-display text-lg font-bold text-muted-foreground">
        🔒 Results unlock after the calls end
      </button>
      <Link to="/" className="mt-3 text-center text-sm font-semibold text-primary">
        You can leave — we'll keep calling
      </Link>
    </Shell>
  );
}

function fmt(s: number) {
  const v = Math.max(0, s);
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`;
}

function SoundWave() {
  return (
    <span className="flex h-6 items-end gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="w-1 animate-wave rounded-full bg-primary" style={{ animationDelay: `${i * 0.12}s` }} />
      ))}
    </span>
  );
}
